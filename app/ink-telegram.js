const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const inkjs = require('inkjs');
const token = require('./token.json').token;

const bot = new TelegramBot(token, {polling: true});

const kbdMessage = {};
const inkStory = {};

const gameFile = path.resolve(__dirname, 'game.ink.json');
const json = fs.readFileSync(gameFile, 'UTF-8').replace(/^\uFEFF/, '');

function sendMessageWithKbd (chatId, text, inline_keyboard) {
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  .then(() => bot.sendMessage(chatId, '-', { parse_mode: 'Markdown', one_time_keyboard: true, reply_markup: { inline_keyboard }}))
  .then((msg) => { kbdMessage[chatId] = msg.message_id; });
}

function getScene(chatId) {
  let text = '';
  let choices = [];
  if (!inkStory[chatId]) {
    return;
  }
  while(inkStory[chatId].canContinue) {
    inkStory[chatId].Continue();
    text += inkStory[chatId].currentText;
  }
  inkStory[chatId].currentChoices.forEach((choice, id) => {
    choices.push([{text:choice.text, callback_data:id}]);
  });
  if (!choices.length) {
    bot.sendMessage(chatId, text + "\n\n--- THE END ---");
    return;
  }
  sendMessageWithKbd(chatId, text || '.', choices);
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
    bot.deleteMessage(chatId, kbdMessage[chatId]).then(() => kbdMessage[chatId] = null);
  }
  if (inkStory[chatId]) {
    inkStory[chatId].ChooseChoiceIndex(res.data);
  }
  getScene(chatId);
});

bot.on("polling_error", (err) => console.error(err));
