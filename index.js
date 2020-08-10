const fs = require('fs');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const dialogflow = require('dialogflow');
const uuid = require('uuid');

const SESSION_FILE_PATH = './session.json';

// Load the session data if it has been previously saved
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
  session: sessionData
});

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
  sessionData = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
    if (err) {
      console.error(err);
    }
  });
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
});


client.on('message', async msg => {

  let chat = await msg.getChat();
  if (chat.isGroup) return

  let contact = await msg.getContact();
  console.log(msg);
  const returned = await runDialogFlow(msg.body);

  if (returned) {
    client.sendMessage(msg.from, `*RoboMich🤖:*  ${contact.name.split(' ')[0]} ${returned}`);
  }
});

client.initialize();

const service_account = require('./service_account.json')
const sessionId = uuid.v4();

// Create a new session
const sessionClient = new dialogflow.SessionsClient({
  keyFilename: 'service_account.json'
});

const sessionPath = sessionClient.sessionPath(service_account.project_id, sessionId);

async function runDialogFlow(client_msg) {

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: client_msg,
        // The language used by the client (en-US)
        languageCode: 'en-US',
      },
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  console.log('Detected intent');
  const result = responses[0].queryResult;
  console.log(`  Query: ${result.queryText}`);
  console.log(`  Response: ${result.fulfillmentText}`);
  if (result.intent) {
    console.log(`  Intent: ${result.intent.displayName}`);
    return result.fulfillmentText;
  } else {
    console.log(`  No intent matched.`);
    return null;
  }
}