const bot = BotManager.getCurrentBot();
const API_KEY = "Your_Gemini_Api_Key";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;
const DB_DIR_PATH = FileStream.getSdcardPath() + "/gemini_chats";
const DB_FILE_PATH = DB_DIR_PATH + "/gemini_history.db";
FileStream.createDir(DB_DIR_PATH);
let db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(DB_FILE_PATH, null);
db.execSQL("CREATE TABLE IF NOT EXISTS chat_history (" + "user_hash TEXT PRIMARY KEY, " + "history TEXT" + ");");
const systemInstruction = {
    parts: [{
        "text": "너는 '제미나이'라는 이름을 가진 AI 어시스턴트야."
    }]
};
let isChatting = {};
function getChatHistory(user_hash) {
    if (!db)
        return [];
    let history = [];
    let cursor = null;
    try {
        cursor = db.rawQuery("SELECT history FROM chat_history WHERE user_hash = ?", [user_hash]);
        if (cursor && cursor.moveToFirst()) {
            const historyJson = cursor.getString(0);
            if (historyJson) {
                history = JSON.parse(historyJson);
            }
        }
    } catch (e) {
        Log.e("대화 기록 불러오기 실패: " + e);
        return [];
    }
    finally {
        if (cursor) {
            cursor.close();
        }
    }
    return Array.isArray(history) ? history : [];
}
function saveChatHistory(user_hash, history) {
    if (!db)
        return;
    try {
        const historyJson = JSON.stringify(history);
        db.execSQL("INSERT OR REPLACE INTO chat_history (user_hash, history) VALUES (?, ?)", [user_hash, historyJson]);
    } catch (e) {
        Log.e("대화 기록 저장 실패: " + e);
    }
}
function clearChatHistory(user_hash) {
    if (!db)
        return;
    try {
        db.execSQL("DELETE FROM chat_history WHERE user_hash = ?", [user_hash]);
        Log.i(user_hash + " 사용자의 대화 기록이 삭제되었습니다.");
    } catch (e) {
        Log.e("대화 기록 삭제 실패: " + e);
    }
}
function sendRequestToGemini(instruction, contents) {
    try {
        const url = new java.net.URL(API_URL);
        const connection = url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        const requestBody = {
            system_instruction: instruction,
            contents: contents,
            safety_settings: [{
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
            }, {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
            }, {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
            }, {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
            }]
        };
        const outputStream = connection.getOutputStream();
        outputStream.write(new java.lang.String(JSON.stringify(requestBody)).getBytes("UTF-8"));
        outputStream.close();
        const inputStream = connection.getInputStream();
        const reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream));
        let response = "";
        let line;
        while ((line = reader.readLine()) != null) {
            response += line;
        }
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.candidates && jsonResponse.candidates.length > 0 && jsonResponse.candidates[0].content.parts[0].text) {
            return jsonResponse.candidates[0].content.parts[0].text;
        } else {
            return "응답을 받지 못했습니다. 안전 설정에 의해 차단되었을 수 있습니다.";
        }
    } catch (error) {
        Log.e("Gemini API 요청 오류: " + error);
        return "API 요청 중 오류가 발생했습니다: " + error.message;
    }
}
function onMessage(msg) {
    const user_hash = msg.author.hash;
    const user_name = msg.author.name;
    if (sender !== "정승환")
        return;
    if (msg.content === "/대화시작") {
        if (isChatting[user_hash]) {
            msg.reply("이미 대화가 진행중입니다.");
            return;
        }
        isChatting[user_hash] = true;
        msg.reply("💬 안녕하세요, " + user_name + "님! 제미나이와 대화를 시작합니다.\n대화 내용은 계속 저장되며, 언제든 다시 돌아와 이어서 대화할 수 있습니다.\n대화를 초기화하고 싶다면 '/대화중단'을 입력해주세요.");
        return;
    }
    if (msg.content === "/대화중단") {
        if (isChatting[user_hash]) {
            delete isChatting[user_hash];
            clearChatHistory(user_hash);
            msg.reply("💬 모든 대화 기록을 삭제하고 세션을 종료합니다. 새로운 대화를 시작하려면 '/대화시작'을 입력해주세요.");
        } else {
            msg.reply("활성화된 대화가 없습니다.");
        }
        return;
    }
    if (isChatting[user_hash]) {
        let history = getChatHistory(user_hash);
        const userMessage = {
            role: "user",
            parts: [{
                text: msg.content
            }]
        };
        history.push(userMessage);
        const geminiResponse = sendRequestToGemini(systemInstruction, history);
        msg.reply(geminiResponse);
        const modelMessage = {
            role: "model",
            parts: [{
                text: geminiResponse
            }]
        };
        history.push(modelMessage);
        saveChatHistory(user_hash, history);
    }
}
bot.addListener(Event.MESSAGE, onMessage);
