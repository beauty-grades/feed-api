export const getEmail = async (utec_token_v2) => {
    const response = await fetch("https://api.utec.edu.pe/user-configuration-api/user/information/data", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${utec_token_v2}`,
            "X-Auth-Token": "hey",
            "Content-Type": "application/json",
        },
        body: "{}",
    });
    const data = await response.json();
    const email = data?.content?.email || null;
    return email;
};
