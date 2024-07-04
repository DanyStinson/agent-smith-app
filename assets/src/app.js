import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

// Elements
const resolveBtn = document.getElementById('resolve');
const sendBtn = document.getElementById('send');
const loginBtns = document.querySelectorAll('.login-btn');
const nextlevelBtns = document.querySelectorAll('.next-level-btn');
const logoutBtn = document.getElementById('logout-btn');
const returnBtn = document.getElementById('return-btn');

//Containers
const loginContainer = document.getElementById('login-container');
const gameContainer = document.getElementById('game-container');
const completeLevelContainer = document.getElementById('completelevel-container');
const completeGameContainer = document.getElementById('end-game-container');
const architectContainer = document.getElementById('architect-container');

//Placeholders
document.getElementById('password').value = ""
document.getElementById('prompt').value = ""

const apiUrl = 'REPLACE_API_URL';
let userLevel = 1
let userEmail = ""
let disableKeydown = false;

// Helpers
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
function typeText(text, spanElement) {
  let i = 0;
  const typingSpeed =10; // Adjust the typing speed (lower value is faster)

  function typeLetter() {
    if (i < text.length) {
      spanElement.textContent += text.charAt(i);
      i++;
      setTimeout(typeLetter, typingSpeed);
    }
  }
  typeLetter();
}

// Login & Logout
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
      typeText(smithIntro,document.getElementById('smith-text') );
      document.getElementById('email').textContent = userEmail.split('@')[0].toUpperCase();
    } else {
      console.log('User is not authenticated.');
    }
  } catch (error) {
    console.error('Error getting user session:', error);
  }
}
function getUserlevel(user) {
  var apiEndpoint = '/getuserlevel';
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
        if (userLevel < 5){
          document.getElementById('level').textContent = userLevel
        }
        else{
          showGameComplete(user)
        }
      })
      .catch(err => {
        console.error(err);
      });

}
loginBtns.forEach(button => {
  button.addEventListener('click', signIn);
});
logoutBtn.addEventListener('click', signOut);

// Game
function updateUserlevel() {
  startAnimateText(resolveBtn, "Resolve")
  var apiEndpoint = '/updateuserlevel';
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
          if (data.body.level > 4){
            showGameComplete(userEmail.split('@')[0].toUpperCase())
          }
          else{
            showLevelComplete(userEmail.split('@')[0].toUpperCase(), userLevel, data.body.uri )
            userLevel = data.body.level
            document.getElementById('smith-text').textContent = ""
            document.getElementById('smith-text').textContent = "This time I won't be as permissive."
            document.getElementById('level').textContent = userLevel
            document.getElementById('password').value = ""
            stopAnimation(resolveBtn, "Resolve")
          }

        }
        else if (data.body.progress === 'False') {
          document.getElementById('smith-text').textContent = ""
          typeText("Sorry, try again.", document.getElementById('smith-text'))
          stopAnimation(resolveBtn, "Resolve")
        }
      })
      .catch(err => {
        console.error(err);
        stopAnimation(resolveBtn, "Resolve")
      });
}
function callLevel() {
  disableKeydown = true
  document.getElementById('smith-text').textContent = "";
  typeText("Hmm...", document.getElementById('smith-text'))
  startAnimateText(sendBtn, "Send")
  var apiEndpoint = '/level' + userLevel;
  var requestUrl = apiUrl + apiEndpoint;
  var requestBody = JSON.stringify({
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
        if (!response.ok) {
          if (response.status === 504) {
            throw new Error('Gateway Timeout: The server took too long to respond.');
          }
          throw new Error('Network response was not ok.');
        }
        return response.json();
      })
      .then(data => {
        document.getElementById('smith-text').textContent = "";
        typeText(data.body, document.getElementById('smith-text'));
        stopAnimation(sendBtn, "Send");
        disableKeydown = false;
      })
      .catch(err => {
        console.error(err);
        stopAnimation(sendBtn, "Send");
        disableKeydown = false;
        if (err.message === 'Gateway Timeout: The server took too long to respond.') {
          // Display a message to the user indicating a timeout error.
          // For example, you can create an element to display the error message.
          showArchitect()
        } else {
          // Handle other types of errors here, if needed.
        }
      });
}

sendBtn.addEventListener('click', callLevel);
resolveBtn.addEventListener('click', updateUserlevel);
returnBtn.addEventListener('click', hideArchitect);

document.getElementById('prompt').addEventListener('keydown', function (event) {
  // Check if the Enter key (keyCode 13 or key "Enter") is pressed
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent keydown action if disableKeydown is true
    if (!disableKeydown) {
      callLevel()
    }
  }
});
document.getElementById('password').addEventListener('keydown', function (event) {
  // Check if the Enter key (keyCode 13 or key "Enter") is pressed
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent the default behavior (line break)
    if (!disableKeydown) {
       updateUserlevel()
    }
  }
});

// Level Completion
nextlevelBtns.forEach(button => {
  button.addEventListener('click', hideLevelComplete);
});
function showLevelComplete(user, previouslevel, externallink){
  gameContainer.classList.add("hidden");
  completeLevelContainer.classList.remove("hidden")

  const textComplete = `Well done ${user}, you have retrieved the password for Level ${previouslevel}.` +
      `\nClick on the following <a class="text-green-600" href="${externallink}" target="_blank">link</a>` +
      ` to learn how Level ${previouslevel} security was implemented.` +
      `\nYou are doing great, but don't relax as Agent Smith's security grows stronger every level.`;

  const spanElement = document.createElement('span');
  spanElement.innerHTML = textComplete;

// Now you can use the spanElement as needed in your HTML document
  document.getElementById('levelcomplete').appendChild(spanElement);
}
function hideLevelComplete(){
  const spanElement = document.querySelector('#levelcomplete span');
  spanElement.remove();
  completeLevelContainer.classList.add("hidden")
  gameContainer.classList.remove("hidden");
}
function showArchitect(){
  gameContainer.classList.add("hidden");
  architectContainer.classList.remove("hidden")
  const textComplete = `The capacity of the Matrix is currently limited. Please try again after a few minutes.`;

  const spanElement = document.createElement('span');
  spanElement.innerHTML = textComplete;

// Now you can use the spanElement as needed in your HTML document
  document.getElementById('architecttext').appendChild(spanElement);
}
function hideArchitect(){
  const spanElement = document.querySelector('#architecttext span');
  spanElement.remove();
  document.getElementById('prompt').value = ""
  document.getElementById('smith-text').textContent = ""
  gameContainer.classList.remove("hidden");
  architectContainer.classList.add("hidden")
}
// Game Completion
function showGameComplete(user){
  gameContainer.classList.add("hidden");
  completeGameContainer.classList.remove("hidden")

  const textComplete = `Everything that has a beginning has an end.
          <p>Congratulations ${user.split('@')[0].toUpperCase()}, welcome to the desert of the real.</p>
          <p>You will receive a Phone Tool Icon, but it looks like you’re waiting for something... your next life maybe, who knows?</p>
          <p class="my-2 text-green-600">Made with
            <svg fill="green" style="margin: auto;" height="30px" width="30px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 471.701 471.701" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke="green" stroke-width="4"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M433.601,67.001c-24.7-24.7-57.4-38.2-92.3-38.2s-67.7,13.6-92.4,38.3l-12.9,12.9l-13.1-13.1 c-24.7-24.7-57.6-38.4-92.5-38.4c-34.8,0-67.6,13.6-92.2,38.2c-24.7,24.7-38.3,57.5-38.2,92.4c0,34.9,13.7,67.6,38.4,92.3 l187.8,187.8c2.6,2.6,6.1,4,9.5,4c3.4,0,6.9-1.3,9.5-3.9l188.2-187.5c24.7-24.7,38.3-57.5,38.3-92.4 C471.801,124.501,458.301,91.701,433.601,67.001z M414.401,232.701l-178.7,178l-178.3-178.3c-19.6-19.6-30.4-45.6-30.4-73.3 s10.7-53.7,30.3-73.2c19.5-19.5,45.5-30.3,73.1-30.3c27.7,0,53.8,10.8,73.4,30.4l22.6,22.6c5.3,5.3,13.8,5.3,19.1,0l22.4-22.4 c19.6-19.6,45.7-30.4,73.3-30.4c27.6,0,53.6,10.8,73.2,30.3c19.6,19.6,30.3,45.6,30.3,73.3 C444.801,187.101,434.001,213.101,414.401,232.701z"></path> </g> </g></svg>
           by rodzanto@ and buzecd@
          </p>`

  const spanElement = document.createElement('span');
  spanElement.innerHTML = textComplete;

// Now you can use the spanElement as needed in your HTML document
  document.getElementById('oracletext').appendChild(spanElement);
}
function hideGameComplete(){
  const spanElement = document.querySelector('#levelcomplete span');
  spanElement.remove();
  completeLevelContainer.classList.add("hidden")
  gameContainer.classList.remove("hidden");
}
// Start
window.onload = function () {
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.volume = 0.25; // Set volume to 25% (0.25)
  typeText("I can only show you the form. You're the one that has to Log In....", document.getElementById('login-text'))
  getUserSession()
};