const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const inkjs = require('inkjs');
const token = require('./token.json').token;

const bot = new TelegramBot(token, {polling: true});

const endgameMessage = '--- THE END ---';
const choiceMessage = '-';

const kbdMessage = {};
const inkStory = {};

const gameFile = path.resolve(__dirname, 'game.ink.json');
const json = fs.readFileSync(gameFile, 'UTF-8').replace(/^\uFEFF/, '');

function endGame(chatId) {
  bot.sendMessage(chatId, endgameMessage)
  .then(() => {
    delete kbdMessage[chatId];
    delete inkStory[chatId];  
  });
}

function sendMessageWithKbd (chatId, text, inline_keyboard) {
  // send message with scene text
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  .then(() => {
    if (!inline_keyboard.length) {
      // game ended
      endGame(chatId);
    } else {
      // provide choices
      bot.sendMessage(chatId, choiceMessage, { parse_mode: 'Markdown', one_time_keyboard: true, reply_markup: { inline_keyboard }})
      .then((msg) => { kbdMessage[chatId] = msg.message_id; });   
    }
  })
}

function getScene(chatId) {
  let text = '';
  let choices = [];
  if (!inkStory[chatId]) {
    return;
  }
  while (inkStory[chatId].canContinue) {
    inkStory[chatId].Continue();
    text += inkStory[chatId].currentText;
  }
  inkStory[chatId].currentChoices.forEach((choice, id) => {
    choices.push([{text:`  ${choice.text}  `, callback_data:id}]);
  });
  sendMessageWithKbd(chatId, text || '.', choices);
}

function continueStory(chatId, choice) {
  if (inkStory[chatId]) {
    inkStory[chatId].ChooseChoiceIndex(choice);
  }
  getScene(chatId);
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text === '/start') {
    inkStory[chatId] = new inkjs.Story(json);
    getScene(chatId);
  } else {
    bot.sendMessage(chatId, 'Say "/start" to start game.');
  }
});

bot.on('callback_query', (res) => {
  const chatId = res.message.chat.id;
  if (kbdMessage[chatId]) {
    bot.deleteMessage(chatId, kbdMessage[chatId])
    .then(() => {
      kbdMessage[chatId] = null;
      continueStory(chatId, res.data);
    });
  } else {
    continueStory(chatId, res.data);
  }
});

bot.on("polling_error", (err) => console.error(err));
