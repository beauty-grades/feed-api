import Xata from "../../../xata";
import { PeriodRecord } from "../../../xata/codegen";
import { fetchCoursesFromPeriod } from "./fetch-courses-from-period";
import { parseEvaluations, Evaluation } from "./parse-evaluations";
import { RawCourseFromPeriodFetched } from "./fetch-courses-from-period/interface";

interface Course {
  name: string;
  teacher: string;
  evaluations: Map<string, Evaluation>;
  wrong_formula: boolean;
  dropped_out: boolean;
  score: number | null;
  section: number;
}

export class PeriodClient {
  period_id: string;
  period_utec_id: number;
  utec_token_v1: string;
  raw_courses: RawCourseFromPeriodFetched[];
  period: PeriodRecord;
  courses = new Map<string, Course>();

  constructor({
    utec_token_v1,
    period_id,
    period_utec_id,
  }: {
    utec_token_v1: string;
    period_id: string;
    period_utec_id: number;
  }) {
    this.utec_token_v1 = utec_token_v1;
    this.period_id = period_id;
    this.period_utec_id = period_utec_id;
  }

  private async fetchData() {
    const raw_courses = await fetchCoursesFromPeriod({
      utec_token_v1: this.utec_token_v1,
      period_utec_id: this.period_utec_id,
    });

    this.raw_courses = raw_courses;
  }

  async init() {
    let period = await Xata.db.period.read(this.period_id);
    if (!period) {
      period = await Xata.db.period.create({
        id: this.period_id,
        utec_id: this.period_utec_id,
      });
    }
    this.period = period;
    await this.fetchData();

    this.raw_courses.forEach(
      ({
        idCourse,
        titleCourse,
        teacher,
        scores,
        formula,
        finalScore,
        section,
      }) => {
        const { evaluations, wrong_formula } = parseEvaluations({
          rawScores: scores,
          formula,
        });

        this.courses.set(idCourse, {
          name: titleCourse.trim(),
          teacher: teacher.trim(),
          evaluations,
          wrong_formula,
          dropped_out: finalScore === "RET",
          score:
            finalScore === "-" || finalScore === "RET"
              ? null
              : Number(finalScore),
          section: Number(section),
        });
      }
    );
  }

  async registerCareerPeriod({
    career_id,
    enrolled_students,
  }: {
    career_id: string;
    enrolled_students: number;
  }) {
    let career_period = await Xata.db.rel_career_period
      .filter({
        career: career_id,
      })
      .filter({
        period: this.period.id,
      })
      .getFirst();
    if (!career_period) {
      career_period = await Xata.db.rel_career_period.create({
        career: career_id,
        period: this.period.id,
        enrolled_students,
      });
    }
  }
}
