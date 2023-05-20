export interface LevelResponse {
  title: string
  courses: {
    codeCourse: string
    course: string
    idCourse: number
    nameTeacher: string
    times: number
    summaryEnrolled: {
      idPeriod: number
      namePeriod: string
      finalNote: number
      classroomAverage: number
      absences: string
    }[]
    beforeCourses: {
      codeCourse: string
      course: string
      idCourse: number
    }[]
    afterCourses: {
      codeCourse: string
      course: string
      idCourse: number
    }[]
    section: string
    credits: number
    score: string
    status: string
    period: string
    isElective: boolean
    nameCourseAssociate?: string
  }[]
}