const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const inkjs = require('inkjs');
const token = require('./token.json').token;

const bot = new TelegramBot(token, {polling: true});

let chatId;
const kbdMessage = {};

const gameFile = path.resolve(__dirname, 'game.ink.json');
const json = fs.readFileSync(gameFile, 'UTF-8').replace(/^\uFEFF/, '');
const inkStory = new inkjs.Story(json);

function sendMessageWithKbd (chatId, text, inline_keyboard) {
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  .then(() => bot.sendMessage(chatId, '-', { parse_mode: 'Markdown', one_time_keyboard: true, reply_markup: { inline_keyboard }}))
  .then((msg) => { kbdMessage[chatId] = msg.message_id; });
}

function getScene() {
  let text = '';
  let choices = [];
  while (inkStory.canContinue) {
    inkStory.Continue();
    text += inkStory.currentText;
  }
  inkStory.currentChoices.forEach((choice, id) => {
    choices.push([{text:choice.text, callback_data:id}]);
  });
  if (!choices.length) {
    bot.sendMessage(chatId, '--- THE END ---');
    return;
  }
  sendMessageWithKbd(chatId, text || '.', choices);
}

bot.on('message', (msg) => {
  chatId = msg.chat.id;
  if (msg.text === '/start') {
    getScene();
  } else {
    bot.sendMessage(chatId, 'Say "/start" to start game.');
  }
});

bot.on('callback_query', (res) => {
  chatId = res.message.chat.id;
  if (kbdMessage[chatId]) {
    bot.deleteMessage(chatId, kbdMessage[chatId]).then(() => kbdMessage[chatId] = null);
  }
  inkStory.ChooseChoiceIndex(res.data);
  getScene();
});

bot.on("polling_error", (err) => console.error(err));
