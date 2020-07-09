$(() => {
    $("#submit").click(async () => {

        if(globals.signedIn){
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    post: $("#post").val(),
                    status: "sent"
                })
            }

            let returned = await fetch("/post", options);
            returned = returned.json();
            console.log(returned);
        }
    })

});