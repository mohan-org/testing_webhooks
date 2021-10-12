import express from "express";
import fetch from "node-fetch";
import crypto from 'crypto';
import { createAppAuth } from "@octokit/auth-app";
import fs from 'fs';

const secret = 'testing_toke';

// For these headers, a sigHashAlg of sha1 must be used instead of sha256
// GitHub: X-Hub-Signature
// Gogs:   X-Gogs-Signature
const sigHeaderName = 'X-Hub-Signature-256'
const sigHashAlg = 'sha256';
const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;

const app = express();

const privateKey = fs.readFileSync(__dirname + "/keys/collector-git2.2021-09-08.private-key.pem");

// console.log({ client_id, client_secret });

function verifyPostData(req) {
  if (!req.rawBody) {
    return false
  }

  const sig = Buffer.from(req.get(sigHeaderName) || '', 'utf8')
  const hmac = crypto.createHmac(sigHashAlg, secret)
  const digest = Buffer.from(sigHashAlg + '=' + hmac.update(req.rawBody).digest('hex'), 'utf8')
  console.log("digest: ",digest)
  if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
    return false
  }

  return true
}

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  },
}));

app.get("/", (req, res) => {
  res.send("Hello GitHub auth");
  
});

// app.post("/", (req, res)=>{
//   console.log("web data: ",req.body)
//   res.send("webhook received")
// })

app.post("/payload",(req, res)=>{
  let resp = verifyPostData(req);
  console.log("responce validation: ",resp)
  console.log("webhooks received************************");
  console.log('REQ BODY: ',req.body);
  res.send("webhook received")
})

app.get('/install', (req, res)=>{
    res.redirect(`https://github.com/apps/collector-git2/installations/new`);
})

// app.get("/login/github", (req, res) => {
//   const redirect_uri = "http://localhost:9000/login/github/callback";
//   res.redirect(
//     `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirect_uri}`
//   );
// });

async function getAccessToken({ code, client_id, client_secret }) {
  console.log('code: ', code)
  const request = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      code
    })
  });
  const text = await request.text();
  console.log("text: ",text)
  const params = new URLSearchParams(text);
  return params.get("access_token");
}

async function fetchGitHubUser(installAccessToken, installation_id) {
  // const request = await fetch("https://api.github.com/app/installations/"+installation_id, {
  //   headers: {
  //     authorization: "Bearer " + installAccessToken.token
  //   }
  // });
  // return await request.json();
  const request = await fetch("https://api.github.com/users/rahulmathews", {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: "Bearer " + installAccessToken
    }
  });
  return await request.json();
}

async function getInstallAccessToken(installation_id){
  const auth = createAppAuth({
    appId: 127643,
    privateKey: privateKey,
    clientId: client_id,
    clientSecret: client_id,
  });
  const installationAuthentication = await auth({
    type: "installation",
    installationId: installation_id,
  });
  // const installationAuthentication = await auth({
  //   type: "app"
  // });
  return installationAuthentication
}

app.get("/login/github/callback", async (req, res) => {


 // console.log("request object:********** ",req);
//  console.log("responce object: ",res);

  const installation_id = req.query.installation_id;
  // const installAccessToken = await getInstallAccessToken(installation_id);
  // console.log("installAccessToken: ", installAccessToken);
  // res.send(installAccessToken);
  const code = req.query.code;
  const access_token = await getAccessToken({ code, client_id, client_secret });
  console.log('access_token: ',access_token)
  //res.send(access_token)
  const user = await fetchGitHubUser(access_token, installation_id);
  console.log("user data: ", user)
  // res.send(user)

});


const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log("Listening on localhost:" + PORT));
