import { FetchedPeriodEnrollmentMetadata } from "./interface";

export const fetchPeriodEnrollmentsMetadata = async ({
  utec_token_v1,
}: {
  utec_token_v1: string;
}) => {
  const response = await fetch(
    "https://api.utec.edu.pe/academico-api/alumnos/me/courses/enrollment/history",
    {
      method: "POST",
      headers: {
        "x-auth-token": utec_token_v1,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        program: 1,
        typeQuery: 1,
      }),
    }
  );

  const json = await response.json();

  return json.content as FetchedPeriodEnrollmentMetadata[];
};
