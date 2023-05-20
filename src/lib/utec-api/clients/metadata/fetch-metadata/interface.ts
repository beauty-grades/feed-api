export interface FetchedPeriodEnrollmentMetadata {
  id: number;
  label: string;
  orderMerit: string;
  weightedAverage?: number;
  ranking?: string;
  curriculum: string;
  career: string;
  faculty: string;
  data: {
    codeCourse: string;
    idCourse: number;
    idStorage: string | null;
    nameFile: string | null;
    career: string | null;
    faculty: string | null;
    course: string;
    credits: number;
    level: string;
    score: string;
    absences: string;
    times: number;
    status: string;
  }[];
}
