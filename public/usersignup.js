let globals = {
    signedIn: false,
    id_token: false,
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
}

async function onSignIn(googleUser) {
    // Useful data for your client-side scripts:
    var profile = googleUser.getBasicProfile();
    console.log("ID: " + profile.getId()); // Don't send this directly to your server!
    console.log('Full Name: ' + profile.getName());
    console.log('Given Name: ' + profile.getGivenName());
    console.log('Family Name: ' + profile.getFamilyName());
    console.log("Image URL: " + profile.getImageUrl());
    console.log("Email: " + profile.getEmail());

    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    console.log("ID Token: " + id_token);

    globals.signedIn = false;
    globals.id_token = id_token;
    globals.name = profile.getName();
    globals.fn = profile.getGivenName();
    globals.ln = profile.getFamilyName();
    globals.email = profile.getEmail();
    globals.pfp = profile.getImageUrl();

}

$(() => {

    $("#submit").click(async () => {
        let options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: globals.id_token,
                signingwithgoogle: true,
                status: "sent",
                atname: $("#atname").val(),
                password: $("#password").val(),
                fn: globals.fn,
                ln: globals.ln
            })
        }

        let returned = await fetch("/user-create", options);
        returned = await returned.json();
        console.log(returned);
        if(returned.status === "ADDED"){
            window.location.href = "index.html";
        }
    })
})
