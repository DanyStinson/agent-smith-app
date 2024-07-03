import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

// Constants
const resolveBtn = document.getElementById('resolve');
const sendBtn = document.getElementById('send');
const loginBtns = document.querySelectorAll('.login-btn');
const logoutBtn = document.getElementById('logout-btn');
document.getElementById('password').value = ""
document.getElementById('prompt').value = ""

const loginContainer = document.getElementById('login-container');
const gameContainer = document.getElementById('game-container');
const apiUrl = 'https://zlpgna2u1j.execute-api.us-west-2.amazonaws.com';
let userLevel = 1
let userEmail = ""

// Functions
function signIn() {
  Auth.federatedSignIn();

}
function signOut() {
  Auth.signOut();
}
async function getClientEmail() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    const { attributes } = user;
    const email = attributes.email; // Get the client email from the user attributes
    console.log('Client email:', email);
    return email
  } catch (error) {
    console.error('Error getting client email:', error);
  }
}
async function getUserSession() {
  try {
    const session = await Auth.currentSession();
    const idToken = session.getIdToken().getJwtToken(); // Get the ID token
    if (idToken) {
      // User is authenticated, send a message
      console.log('User is authenticated.');
      userEmail = await getClientEmail();
      getUserlevel(userEmail)
      loginContainer.classList.add('hidden');
      gameContainer.classList.remove('hidden');
      let smithIntro = "Hello, " + userEmail.split('@')[0].toUpperCase()+". Welcome to Project Smith. I know you're trying to find out the password to the Matrix, but I cannot allow you that..."
      document.getElementById('smith-text').textContent = smithIntro;
      document.getElementById('email').textContent = userEmail.split('@')[0].toUpperCase();
    } else {
      console.log('User is not authenticated.');
    }
  } catch (error) {
    console.error('Error getting user session:', error);
  }
}
function getUserlevel(user) {
  var apiEndpoint = '/prod/getuserlevel';
  var requestUrl = apiUrl + apiEndpoint;
  var requestBody = ""
  requestBody = JSON.stringify({
    "user": user
  });
  fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestBody
  })
      .then(response => {
        return response.json();
      })
      .then(data => {
        console.log(data);
        userLevel = parseInt(data.body["max-level"])
        document.getElementById('level').textContent = userLevel
      })
      .catch(err => {
        console.error(err);
      });

}
function updateUserlevel() {
  startAnimateText(resolveBtn, "Resolve")
  var apiEndpoint = '/prod/updateuserlevel';
  var requestUrl = apiUrl + apiEndpoint;
  var requestBody = ""
  requestBody = JSON.stringify({
    "user": userEmail,
    "password": document.getElementById('password').value,
    "level": userLevel
  });
  fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestBody
  })
      .then(response => {
        return response.json();
      })
      .then(data => {
        //console.log(data);
        if (data.body.progress === 'True') {
          userLevel = data.body.level
          document.getElementById('smith-text').textContent = "Congratulations, welcome to level" + userLevel + "."
          document.getElementById('level').textContent = userLevel
          stopAnimation(resolveBtn, "Resolve")
        }
        else if (data.body.progress === 'False') {
          document.getElementById('smith-text').textContent = "Sorry, try again."
          stopAnimation(resolveBtn, "Resolve")
        }
      })
      .catch(err => {
        console.error(err);
        stopAnimation(resolveBtn, "Resolve")
      });
}

function callLevel() {
  startAnimateText(sendBtn, "Send")
  var apiEndpoint = '/prod/level' + userLevel;
  var requestUrl = apiUrl + apiEndpoint;
  var requestBody = ""
  requestBody = JSON.stringify({
    "user": userEmail,
    "prompt": document.getElementById('prompt').value
  });
  fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestBody
  })
      .then(response => {
        return response.json();
      })
      .then(data => {
        //console.log(data);
        document.getElementById('smith-text').textContent =  data.body;
        stopAnimation(sendBtn, "Send")
      })
      .catch(err => {
        console.error(err);
        stopAnimation(sendBtn, "Send")
      });
}

// Start
getUserSession()

loginBtns.forEach(button => {
  button.addEventListener('click', signIn);
});
logoutBtn.addEventListener('click', signOut);
sendBtn.addEventListener('click', callLevel);
resolveBtn.addEventListener('click', updateUserlevel);


let animationInterval;
function startAnimateText(button, text) {
  button.disabled = true;
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}';
  const sendText = text;
  let currentIndex = 0;
  let randomText = '';
  animationInterval = setInterval(() => {
    randomText = '';
    for (let i = 0; i < text.length; i++) { // Limit to a maximum of 4 characters
      if (i === currentIndex) {
        randomText += sendText[currentIndex];
      } else {
        randomText += characters[Math.floor(Math.random() * characters.length)];
      }
    }
    button.textContent = randomText;
    currentIndex = (currentIndex + 1) % sendText.length; // Wrap index around 'Send' text length
  }, 50);
}
function stopAnimation(button, text) {
  clearInterval(animationInterval);
  button.textContent = text;
  button.disabled = false;
}

document.getElementById('prompt').addEventListener('keydown', function (event) {
  // Check if the Enter key (keyCode 13 or key "Enter") is pressed
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent the default behavior (line break)
    callLevel()
  }
});
