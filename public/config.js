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
            returned = await returned.json();
            console.log(returned);
        }
    })

    $("#get").click(async () => {

        if(globals.signedIn){
            let returned = await fetch("/post");
            returned = await returned.json();


            $("#entries").empty();
            returned.sort((a,b) => {return a.timestamp - b.timestamp})
            console.log(returned);

            for(let post of returned){
                console.log(post);
                let newdiv = $("<div>").css("margin","20px");
                newdiv.append($("<img>").attr("src",post.imgurl).attr("width","30px").css("float","left"));
                newdiv.append($("<span>").text(post.name + ": " + post.post));
                newdiv.append($("<br>"));
                newdiv.append($("<span>").text("At " + post.timestamp));
                //

                $("#entries").append(newdiv)
            }
        }
    })

});