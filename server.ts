const express = require('express')
const path = require('path');
const session = require('express-session')
const uuid = require('uuid')

import { User } from './types/user'

import { Course } from './types/course'
import { Exam } from './types/exam'
import { Assignment } from './types/assignment'
import { Extracurricular } from './types/extracurricular'

import { Database } from './database'

export class Server {
  private app : any;
  private port : number;
  private database : Database;

  constructor(db : Database, port: any) {
    this.database = db
    this.port = port;

    this.app = express();
    this.CreateRouting();

    this.app.listen(this.port, () => {
      console.log('Express started on port ' + this.port)
    })
  }

  private CreateRouting() {

    this.app.use(session({
      genid: function(req : any) {
        return uuid.v4()
      },
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: true
    }))

    // express stuff
    this.app.get('/', (req : any, res : any) => {
      res.sendFile(path.join(__dirname + '/static/index.html'));
    })

    this.app.get('/dashboard', (req : any, res : any) => {
      res.sendFile(path.join(__dirname + '/static/dashboard.html'));
    })

    this.app.get('/calendar', (req : any, res : any) => {
      res.sendFile(path.join(__dirname + '/static/calendar.html'));
    })

    this.app.use('/lib', express.static('static/lib'));
    this.app.use('/css', express.static('static/css'));
    this.app.use('/img', express.static('static/img'));
    this.app.use('/script', express.static('static/script'));

    // API stuff

    this.app.use(express.json())
    /*
    this.app.use(function (req : any, res : any, next : any) {
      if (!req.session.uid) {
        req.session.uid = {};
        console.log(req.session);
     }
   });
*/
    this.app.post('/user/register', this.RequestRegister.bind(this))
    this.app.post('/user/login', this.RequestLogin.bind(this))

    // ???
    this.app.post('/user/:uid', this.RequestGetUser.bind(this))

    // COURSE STUFF
    this.app.post('/api/course/all', this.RequestGetAllCourses.bind(this))
    this.app.post('/api/course/create', this.RequestCreateCourse.bind(this))
    this.app.post('/api/course/:id', this.RequestGetCourse.bind(this))
    this.app.post('/api/course/:id/delete', this.RequestDeleteCourse.bind(this))
    this.app.post('/api/course/:id/update', this.RequestUpdateCourse.bind(this))

    // ASSIGNMENT STUFF
    this.app.post('/api/assignment/all', this.RequestGetAllAssignments.bind(this))
    this.app.post('/api/assignment/create', this.RequestCreateAssignment.bind(this))
    this.app.post('/api/assignment/:id', this.RequestGetAssignment.bind(this))
    this.app.post('/api/assignment/:id/delete', this.RequestDeleteAssignment.bind(this))
    this.app.post('/api/assignment/:id/update', this.RequestUpdateAssignment.bind(this))

    // EXTRACURRICULAR STUFF
    this.app.post('/api/extracurricular/all', this.RequestGetAllExtracurriculars.bind(this))
    this.app.post('/api/extracurricular/create', this.RequestCreateExtracurricular.bind(this))
    this.app.post('/api/extracurricular/:id', this.RequestGetExtracurricular.bind(this))
    this.app.post('/api/extracurricular/:id/delete', this.RequestDeleteExtracurricular.bind(this))
    this.app.post('/api/extracurricular/:id/update', this.RequestUpdateExtracurricular.bind(this))

    // EXAM STUFF
    this.app.post('/api/exam/all', this.RequestGetAllExams.bind(this))
    this.app.post('/api/exam/create', this.RequestCreateExam.bind(this))
    this.app.post('/api/exam/:id', this.RequestGetExam.bind(this))
    this.app.post('/api/exam/:id/delete', this.RequestDeleteExam.bind(this))
    this.app.post('/api/exam/:id/update', this.RequestUpdateExam.bind(this))

    // CALENDAR
    this.app.post('/api/calendar', this.RequestGetCalendar.bind(this))

  }

  private checkAuthorization(id1 : number, id2 : number) : boolean {
    return (id1 == id2)
  }

  private validateSessionAndGetUID(req : any) : number | null {
    console.log(req.session);
    if (req.session.uid !== null) {
      console.log("good")
      return req.session.uid
    } else {
      console.log("bad")
      return null;
    }
  }

  // Requests

  private async RequestRegister(req : any, res : any) {
    var response : any = {
      'status': 'success',
      user: null
    }

    try {
      // todo validation

      let name = req.body.name;
      let hash = await User.createHash(req.body.password)

      let existingUser = await this.database.getUserByName(name);

      if (existingUser != null) {
        // username taken
        response = {
          status: 'failed',
          message: 'Username is already in use'
        };
      } else {
        let user : User = await this.database.createUser(name, hash)

        response = {
          status: 'success',
          user: await user.objectify()
        };
      }
    } catch (e) {
      console.log(e)
      response = {
        status: 'error'
      };
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestLogin(req : any, res : any) {
    var response : any = {
      status: 'failed',
      message: 'Incorrect username or password'
    }

    let name = req.body.name;
    let hash = await User.createHash(req.body.password)

    let user = await this.database.getUserByName(name)

    console.log(user)

    if (user != null) {
      if (await user.checkHash(req.body.password)) {
        // auth success
        response.status = 'success';
        response.user = await user.objectify();
        response.message = '';

        req.session.uid = user.id;
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestGetUser(req : any, res : any) {
    var response;
    try {
      var uid = parseInt(req.params.uid)

      if (!uid || this.checkAuthorization(uid, req.session.uid)) throw new Error();

      let user : User = await this.database.getUser(uid)

      response = {
        'status': 'success',
        'user': await user.objectify()
      }
    } catch(e) {
      console.log(e)
      response = {
        'status': 'failed',
        'error': 'Unable to get ' + req.params.uid
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestGetAllCourses(req : any, res : any) {
    //console.log(req);
    var _uid = this.validateSessionAndGetUID(req);
    if (_uid == null) {
      res.end(JSON.stringify({status: 'unauthorized'}));
      return;
    }
    var uid : number = _uid;

    var response = {
      status: 'success',
      courses: [
        {
          title: 'CS 326',
          id: 1
        },
        {
          title: 'CS 373',
          id: 2
        },
        {
          title: 'CS 589',
          id: 3
        }
      ]
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestCreateCourse(req : any, res : any) {
    var response : object = {};

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestGetCourse(req : any, res : any) {
    var response : object = {};


    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestDeleteCourse(req : any, res : any) {
    var response : object = {};

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestUpdateCourse(req : any, res : any) {
    var response : object = {};


    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestGetAllAssignments(req : any, res : any) {
    var _uid = this.validateSessionAndGetUID(req);
    if (_uid == null) {
      res.end(JSON.stringify({status: 'unauthorized'}));
      return;
    }
    var uid : number = _uid;

    let assignments = await this.database.getAssignmentsForUser(uid);

    assignments.sort((a, b) => {
      return a.due - b.due
    })

    let now = Date.now()
    let today = new Date()

    let todayEnd = new Date()
    todayEnd.setHours(24)
    todayEnd.setMinutes(0)
    todayEnd.setSeconds(0)
    todayEnd.setMilliseconds(0)

    let todayEndTime = todayEnd.getTime()

    let tomorrowEnd = new Date(today)
    tomorrowEnd.setHours(24)
    tomorrowEnd.setMinutes(0)
    tomorrowEnd.setSeconds(0)
    tomorrowEnd.setMilliseconds(0)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

    console.log(tomorrowEnd.getTime())

    let tomorrowEndTime = tomorrowEnd.getTime()

    let thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(today.getDate() + 7);
    thisWeekEnd.setHours(0)
    thisWeekEnd.setSeconds(0)

    let thisWeekEndTime = thisWeekEnd.getTime()

    // TODO sort, categories

    let categoryData : any = [
      {
        title: 'Late',
        threshold: 0
      },
      {
        title: 'Today',
        threshold: now
      },
      {
        title: 'Tomorrow',
        threshold: todayEndTime
      },
      {
        title: 'This Week',
        threshold: tomorrowEndTime
      },
      {
        title: 'Happily Ever After',
        threshold: thisWeekEndTime
      }
    ];
    let currentCategory = 0;

    let categories = [];
    let category: any = {title: categoryData[currentCategory].title, assignments: []}

    for (let assignment of assignments) {
      let due = assignment.due;

      while (currentCategory + 1 < categoryData.length && due >= categoryData[currentCategory + 1].threshold) {
        if (category.assignments.length > 0) {
          categories.push(category)
        }

        currentCategory++;
        category = {title: categoryData[currentCategory].title, assignments: []}
      }

      category.assignments.push(await assignment.objectify());

    }

    categories.push(category)


    var response : object = {
      status: 'success',
      categories: categories
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestGetAssignment(req : any, res : any) {

  }

  private async RequestCreateAssignment(req : any, res : any) {
    var _uid = this.validateSessionAndGetUID(req);
    if (_uid == null) {
      res.end(JSON.stringify({status: 'unauthorized'}));
      return;
    }
    var uid : number = _uid;

    let response;

    try {
      var name = req.body.name;
      var courseId = req.body.courseId;
      var due = req.body.due;
      var note = req.body.note;
      var ttc = req.body.ttc;

      let assignment = await this.database.createAssignment(uid, name, courseId, due, note, ttc);

      response = {
        status: 'success',
        assignment: await assignment.objectify()
      }
    } catch (e) {
      response = {
        status: 'failed',
        message: e.message
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestDeleteAssignment(req : any, res : any) {

  }

  private async RequestUpdateAssignment(req : any, res : any) {

  }

  private async RequestGetAllExams(req : any, res : any) {

  }

  private async RequestGetExam(req : any, res : any) {
    var response : object;

    try {
      let id = req.body.id;
      let uid = req.session.uid;

      let exam : Exam = await this.database.getExam(id)

      if (!this.checkAuthorization(exam.uid, uid)) {
        response = {
          status: 'unauthorized'
        };
      } else {
        response = {
          status: 'success',
          exam: exam.objectify()
        };
      }
    } catch (e) {
      response = {
        status: 'error',
        error: e.message
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }

  private async RequestCreateExam(req : any, res : any) {

  }

  private async RequestDeleteExam(req : any, res : any) {

  }

  private async RequestUpdateExam(req : any, res : any) {

  }

  private async RequestGetAllExtracurriculars(req : any, res : any) {

  }

  private async RequestGetExtracurricular(req : any, res : any) {

  }

  private async RequestCreateExtracurricular(req : any, res : any) {

  }

  private async RequestDeleteExtracurricular(req : any, res : any) {

  }

  private async RequestUpdateExtracurricular(req : any, res : any) {

  }

  private async RequestGetCalendar(req : any, res : any) {

    let uid = req.session.uid;

    let calendarEvents = [];

    let exams = await this.database.getExamsForUser(uid);
    // let extracurriculars = await this.database.getExtracurricularsForUser(uid);
    // let assignments      = await this.database.getAssignmentsForUser(uid);
    // let courses          = await this.database.getCoursesForUser(uid);

    for (let exam of exams) {
      let calendarEntry = {
        type: 'exam',
        id: exam.id,
        event: exam.calendarData
      }

      calendarEvents.push(calendarEntry)
    }

    // TODO : extra
    // TODO : assign
    // TODO : coures

    var response = {
      status: 'success',
      calendar: exams
    };

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response))
  }
}
