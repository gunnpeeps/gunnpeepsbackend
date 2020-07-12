$(() => { 
    $("#usersget").click(async () => {
        if (globals.signedIn) {
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    status: "sent",
                })
            }

            let returned = await fetch("/users-get", options);
            returned = await returned.json();
            console.log(returned);
        }
    })
});