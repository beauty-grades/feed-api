import { RawPeriodFetched } from "./feed/interfaces";

export const fetchPeriods = async ({
  utec_token_v1,
}: {
  utec_token_v1: string;
}) => {
  const res_get_periods = await fetch(
    "https://api.utec.edu.pe/academico-api/alumnos/me/periodosPorAlumno",
    {
      method: "POST",
      headers: {
        "x-auth-token": utec_token_v1,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hello: "world",
      }),
    }
  );

  const json = await res_get_periods.json();
  const fetched_periods = json.content as RawPeriodFetched[];

  return fetched_periods.map(({ codPeriodo, descPeriodo }) => ({
    utec_id: codPeriodo,
    id: descPeriodo.replace(/\s/g, ""),
  }));
};
