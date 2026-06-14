export const useSignup = async(data: string) => {
    const response = await fetch("http://localhost:8000/auth/me", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${data}`,

        }
    })

    return await response.json();
}
