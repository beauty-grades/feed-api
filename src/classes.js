// 1st level classes
export class Curriculum {
  constructor(handle) {
      this.handle = handle;
  }
}
export class Period {
  constructor(handle) {
      this.handle = handle;
  }
}
export class Course {
  constructor(handle, name) {
      this.handle = handle;
      this.name = name;
  }
}
export class Student {
  constructor(email) {
      this.email = email;
  }
}
export class Teacher {
  constructor(first_name, last_name) {
      this.first_name = first_name;
      this.last_name = last_name;
  }
}
// 2nd level classes
export class Level {
  constructor(number, curriculum) {
      this.number = number;
      this.curriculum = curriculum;
  }
  setElectiveCount(count) {
      this.elective_count = count;
  }
}
export class Clase {
  constructor(course, period) {
      this.course = course;
      this.period = period;
  }
}
export class Student_Curriculum {
  constructor(student, curriculum) {
      this.student = student;
      this.curriculum = curriculum;
  }
}
// 3rd level classes
export class Level_Course {
  constructor(level, course, credits) {
      this.level = level;
      this.course = course;
      this.credits = credits;
  }
}
export class Classroom {
  constructor(section, clase, teacher) {
      this.section = section;
      this.clase = clase;
      this.teacher = teacher;
  }
  setScore(score) {
      this.score = score;
  }
}
export class Evaluation {
  constructor(handle, name, weight, delete_lowest, clase) {
      this.handle = handle;
      this.name = name;
      this.weight = weight;
      this.delete_lowest = delete_lowest;
      this.clase = clase;
  }
}
// 4th level classes
export class Enrollment {
  constructor(student, classroom, final_score) {
      this.student = student;
      this.classroom = classroom;
      this.final_score = final_score;
  }
}
// 5th level classes
export class Score {
  constructor(evaluation, enrollment, grades) {
      this.evaluation = evaluation;
      this.enrollment = enrollment;
      this.grades = grades;
  }
  addGrade(grade) {
      this.grades.push(grade);
  }
}