import { fetchPeriodEnrollmentsMetadata } from "./fetch-metadata";

type Period = {
  curriculum: string;
  career: string;
  total_students?: number;
  score?: number;
  merit_order?: number;
};

export class MetadataClient {
  utec_token_v1: string;
  periods = new Map<string, Period>();
  first_period: string;
  last_period: string;

  constructor({ utec_token_v1 }: { utec_token_v1: string }) {
    this.utec_token_v1 = utec_token_v1;
  }

  async init() {
    const raw_periods = await fetchPeriodEnrollmentsMetadata({
      utec_token_v1: this.utec_token_v1,
    });

    raw_periods.forEach((period) => {
      let total_students: number | null,
        merit_order: number | null = null;
      if (!period.orderMerit.includes("-")) {
        const mmm = period.orderMerit.split(" de ");
        if (mmm.length === 2) {
          total_students = parseInt(mmm[1]);
          merit_order = parseInt(mmm[0]);
        }
      }

      this.periods.set(period.label.replace(/\s/g, ""), {
        curriculum: period.curriculum,
        career: period.career,
        total_students,
        merit_order,
        score: period.weightedAverage,
      });
    });

    this.first_period = [...this.periods].sort()[0][0];
    this.last_period = [...this.periods].sort().reverse()[0][0];
  }
}
