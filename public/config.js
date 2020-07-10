$(() => {
    $("#submit-announce").click(async () => {

        if(globals.signedIn){
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    post: $("#post").html(),
                    status: "sent"
                })
            }

            let returned = await fetch("/announcements", options);
            returned = await returned.json();
            console.log(returned);
        }
    })

    $("#get-announce").click(async () => {

        if(globals.signedIn){
            let returned = await fetch("/announcements");
            returned = await returned.json();


            $("#entries").empty();
            returned.sort((a,b) => {return b.timestamp - a.timestamp})
            console.log(returned);

            for(let post of returned){
                console.log(post);
                let newdiv = $("<div>").css("margin","20px");
                newdiv.append($("<img>").attr("src",post.imgurl).attr("width","30px").css("float","left"));
                newdiv.append($("<span>").html(post.post));
                newdiv.append($("<br>"));
                newdiv.append($("<span>").text(post.name + " at " + post.timestamp));

                $("#entries").append(newdiv)
            }
        }
    })

    $("#create-forum").click(async () => {
        if (globals.signedIn) {
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    //post: $("#post").html(),
                    status: "sent",
                    forum: $("#forum").val(),
                    create: true,
                    read: "ALL",
                    write: "ALL"
                })
            }

            let returned = await fetch("/forums", options);
            returned = await returned.json();
            console.log(returned);
        }
    })

    $("#post-to-forum").click(async () => {
        if (globals.signedIn) {
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    status: "sent",
                    forum: $("#forum").val(),
                    create: false,
                    read: "ALL",
                    write: "ALL",
                    post: $("#post").html()
                })
            }

            let returned = await fetch("/forums", options);
            returned = await returned.json();
            console.log(returned);
        }
    })

    $("#get-forum").click(async () => {
        if (globals.signedIn) {
            let options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: globals.id_token,
                    status: "sent",
                    forum: $("#forum").val(),
                })
            }

            let returned = await fetch("/forums-get", options);
            returned = await returned.json();
            $("#entries").empty();
            returned.sort((a, b) => { return b.timestamp - a.timestamp })
            console.log(returned);

            for (let post of returned) {
                console.log(post);
                let newdiv = $("<div>").css("margin", "20px");
                newdiv.append($("<img>").attr("src", post.imgurl).attr("width", "30px").css("float", "left"));
                newdiv.append($("<span>").html(post.post));
                newdiv.append($("<br>"));
                newdiv.append($("<span>").text(post.name + " at " + post.timestamp));

                $("#entries").append(newdiv)
            }
        }
    })

});