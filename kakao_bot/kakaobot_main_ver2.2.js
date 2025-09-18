/**
 * 파일명: chtbot.js
 * 설명: 카카오톡 챗봇 (AI가 항상 한국어로 답변하도록 수정)
 * 작성자: Watson
 * 버전: 1.1.7.
 * 업데이트 이력
 * * * [ver 1.1.1.] 20250625 프로젝트 생성, 관리자 명령어                      (##0)
 * * * [ver 1.1.2.] 20250625 스크립트 On/Off 기능 추가, 실행중인 스크립트 리스트 조회 (##1)
 * * * [ver 1.1.3.] 20250702 컴파일, 환경, gc 기능 추가                        (##2)
 * * * [ver 1.1.4.] 20250708 json file 내용 조회 추가                          (##3)
 * * * [ver 1.1.5.] 20250700 파파고 번역 추가 (##99)
 * * * [ver 1.1.6.] 20250717 채팅방 등급제 및 포인트제 도입                    (##4)
 * * * [ver 1.1.7.] 20250721 방 비율 조정 기능 추가                            (##5)
* * * [ver 1.1.7.] 20250804 초성/넌센스/이모지 문제 조회                       (##6)
 * * * [ver 1.1.7.] 20250806 공지글 등록/삭제                                  (##7)
 */
//=================== 방 등급제 실행 ==================== ##4

// Java 라이브러리 import
const Jsoup = org.jsoup.Jsoup;
const URL = java.net.URL;
const HttpURLConnection = java.net.HttpURLConnection;
const BufferedReader = java.io.BufferedReader;
const InputStreamReader = java.io.InputStreamReader;
// [수정] DataOutputStream 대신 OutputStreamWriter를 사용합니다.
const OutputStreamWriter = java.io.OutputStreamWriter;

// ==================== [중요] 설정 부분 ====================
// 1단계에서 발급받은 본인의 Gemini API 키를 아래 "" 안에 붙여넣으세요.
const GEMINI_API_KEY = "AIzaSyBzt3HzlenXzZZZ_S_lbLV704XWLqr3I64";
// =======================================================


// ==================== [DB] 설정 부분 STRT ===================
const DB_BASE_PATH = "sdcard/msgbot/database/";
const DB_PATH = DB_BASE_PATH + "attendance.json";// 출석체크 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const DB_MSG_PATH = DB_BASE_PATH + "message.json";// 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
//const LOG_FILE_PATH = BASE_PATH + "chat_log.json";// 채팅 이력 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const SETTINGS_FILE_PATH = DB_BASE_PATH + "room_settings.json";
const GAME_SETTINGS_PATH = DB_BASE_PATH + "quiz/game_settings.json";

const SETTING_DB = "room_settings.json";
const ANNOUNCEMENT_PATH = "/announcements.json"; // ★★★ 공지 파일 경로
const SQLD_QUIZ = "quiz/sqld_quiz.csv";
const SENTENCE_QUIZ = "quiz/sentence.json";
const CHOSUNG_QUIZ = "quiz/chosung.json";
const NONSENSE_QUIZ = "quiz/nonsense.json";
const EMOTION_QUIZ = "quiz/emotion.json";

const ADMIN_NAME = ["정승환", "DEBUG SENDER", "람대장"]; // 출석부 초기화 권한을 가질 관리자 이름

// 한 번에 보여줄 최대 라인 수
const MAX_LINES_TO_SHOW = 20;
const today = getTodayDateString();

// ==================== 선언부 시작 =====================
// ==================== 출석체크 함수 ====================
/**
 * JSON 문자열에 포함될 수 있는 특수문자를 이스케이프 처리합니다.
 * @param {string} str - 원본 문자열
 * @returns {string} - 이스케이프 처리된 문자열
 */
function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

// 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환하는 함수
const chk;
function getTodayDateString(chk) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    if (chk == 'kor') return year + '년 ' + month + '월 ' + day + '일';
    else return year + '-' + month + '-' + day;
}

function scriptOnOff(replier) {
    var scripts = Api.getScriptNames(); //스크립트들을 배열로 하나씩 나눈다.
    var scriptamount = scripts.length; //스크립트들의 개수
    var onscripts = [];
    for (var i = 0; i < scriptamount; i++) {
        if (Api.isOn(scripts[i])) onscripts.push(scripts[i]);
    }
    var tmp_msg = "[현재 실행 중인 스크립트]\n - ";
    tmp_msg += onscripts.join("\n - ");
    return tmp_msg;
}

/**
 * 저장된 방 등급 데이터를 불러오는 함수
 * @returns {object} 방 등급 데이터 객체
 */
function loadDatabase(dbName) {
    const fileContent = FileStream.read(dbName);
    if (fileContent === null || fileContent === "") {
        return {}; // 파일이 없거나 비어있으면 빈 객체 반환
    }
    try {
        // JSON 문자열을 자바스크립트 객체로 변환
        return JSON.parse(fileContent);
    } catch (e) {
        // 파일 내용이 잘못된 JSON 형식일 경우를 대비
        Log.e("데이터베이스 파일을 읽는 중 오류 발생: " + e);
        return {};
    }
}

/**
 * 방 등급 데이터를 파일에 저장하는 함수
 * @param {object} db - 저장할 방 등급 데이터 객체
 */
function saveDatabase(path, data) {
    try {
        FileStream.write(path, JSON.stringify(data, null, 2));
    } catch (e) { Log.e("JSON 저장 오류 (" + path + "): " + e); }
}

/**
 * 방 등급 데이터를 파일에 삭제하는 함수
 * @param {object} db - 삭제할 방 등급 데이터 객체
 */
function deleteDatabase(path, data) {
    try {
        FileStream.remove(path, JSON.stringify(data, null, 2));
    } catch (e) { Log.e("JSON 저장 오류 (" + path + "): " + e); }
}

// 게임 목록
(관리 및 설정에 사용)
const GAME_LIST = ['updown', 'sentence', 'chosung', 'sqld', 'nonsense'];

function gameMaker(dbName, replier, answer, hint) {
    let GAME_FILE_PATH = DB_BASE_PATH + dbName;
    try {
        let games = [];
        let gameType = (dbName === CHOSUNG_QUIZ) ? "초성" : "넌센스";
        // 기존 로그 파일이 있으면 읽어오기
        if (FileStream.read(GAME_FILE_PATH)) {
            games = JSON.parse(FileStream.read(GAME_FILE_PATH) || "[]");
        }

        if (games.some(q => q.answer === answer)) {
            replier.reply("❌ 이미 등록된 " + gameType + " 퀴즈입니다.");
            return;
        }

        // 새 로그 추가 (보낸사람, 방이름, 현재시간 타임스탬프)
        games.push({
            answer: answer,
            hint: hint
        });

        // 변경된 로그를 다시 파일에 쓰기
        FileStream.write(GAME_FILE_PATH, JSON.stringify(games, null, 2));
        replier.reply('✅ ' + gameType + '퀴즈 [' + answer + ' | ' + hint + ']가 성공적으로 등록되었습니다!');
    } catch (e) {
        Log.e("게임 저장 중 오류 발생: " + dbName + "\n" + e);
        replier.reply("게임 저장 중 오류 발생: " + dbName + "\n" + e);
    }
}

function gameDelete(dbName, wordToDelete, replier) {
    let gameList = loadDatabase(DB_BASE_PATH + dbName);
    let initialLength = gameList.length;

    // 삭제할 단어를 제외한 나머지 퀴즈들로 새로운 배열을 생성
    const updatedGameList = gameList.filter(function (quiz) {
        return quiz.answer !== wordToDelete;
    });
    let gameType = (dbName === CHOSUNG_QUIZ) ? "초성" : "넌센스";
    if (initialLength === updatedGameList.length) {
        // 배열의 길이가 같다면, 삭제할 단어를 찾지 못한 것
        replier.reply("❌ ['" + wordToDelete + "'] 단어를 찾을 수 없습니다.");
    } else {
        // 변경된 배열을 파일에 덮어쓰기
        saveDatabase(DB_BASE_PATH + dbName, updatedGameList);
        replier.reply("🗑️ ['" + wordToDelete + "'] " + gameType + "퀴즈가 삭제되었습니다.");
    }
}

function sendImg(room, link, s1, s2) {
    Kakao.send(room, {
        "link_ver": "4.0",
        "template_id": 37628,
        "template_args": {
            img: link, s1: s1, s2: s2
        }
    }, "custom");
}

function getSize(url) {
    let link = java.net.URL(url);
    let con = link.openConnection();
    con.setUseCaches(false);
    con.setConnectTimeout(5000);
    let bis = new java.io.BufferedInputStream(con.getInputStream());
    let bitmap = new android.graphics.BitmapFactory.decodeStream(bis);
    bis.close();
    return [bitmap.getWidth(), bitmap.getHeight()];
}

// ==================== 선언부 종료 =====================

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 관리자가 아니거나 테스트방이 아니면 종료
    if (!ADMIN_NAME.includes(room) || !ADMIN_NAME.includes(sender)) {
        return;
    }

    try {
        // 메시지가 '/'로 시작하는 경우에만 명령어 처리를 시작합니다.
        if (msg.startsWith('/')) {
            //=================== 스크립트 끄기 ===================== ##1
            if (msg.startsWith("/끄기 ")) {
                let content = msg.substring(4).trim();
                Api.off(content);
                if (Api.isOn(content) === false) {
                    replier.reply(content + " 스크립트가 종료됐습니다.");
                } else {
                    replier.reply(content + " 스크립트 종료하지 못했습니다.");
                }
                replier.reply(scriptOnOff());
            }
            else if (msg == "/끄기") {
                Api.off();
                Api.on("admin");
                replier.reply("모든 스크립트가 종료됐습니다.");
                replier.reply(scriptOnOff());
            }
            //=================== 스크립트 켜기 ===================== ##1
            else if (msg.startsWith("/켜기 ")) {
                let content = msg.substring(4).trim();
                Api.on(content);
                if (Api.isOn(content)) {
                    replier.reply(content + " 스크립트가 실행됐습니다.");
                } else {
                    replier.reply(content + " 스크립트 실행을 실패했습니다.");
                }
                replier.reply(scriptOnOff());
            }
            else if (msg == "/켜기") {
                Api.on();

                replier.reply("모든 스크립트가 실행됐습니다.");
                replier.reply(scriptOnOff());
            }
            //=================== 실행중인 스크립트 ================== ##1
            else if (msg.startsWith("/스크립트")) {
                replier.reply(scriptOnOff());
            }
            //=================== 구축환경 정보 ===================== ##2
            else if (msg.startsWith("/환경")) {
                let setupTxt = '[메신저봇 구성 환경 정보]\n';
                setupTxt += ' * 안드로이드 버전명: ' + Device.getAndroidVersionName() + '\n';
                setupTxt += ' * 기기 브랜드명: ' + Device.getPhoneBrand() + '\n';
                //setupTxt += ' * 기기 모델명: ' + Device.getPhoneModel() + '\n';
                setupTxt += ' * 기기 모델명: Galaxy Tab A (2018, 10.5)\n    - 모델번호: SM-T595N\n';
                setupTxt += ' * 기기 온도: ' + ((Device.getBatteryTemperature() - 32) / 18).toFixed(2) + ' ℃\n';
                setupTxt += ' * 기기 배터리 상태: ' + Device.getBatteryLevel() + ' %';
                setupTxt += Device.isCharging() === true ? '(⚡)' : '';

                replier.reply(setupTxt);
            }
            //=================== 파파고 번역 ====================== ##99
            else if (msg.startsWith("/번역 ")) {
                const regex_en = /^[a-zA-Z]+$/;
                const regex_ko = /^[가-힣]+$/;

                var KorE = msg.substring(4).trim();

                if (regex_ko.test(KorE)) {
                    replier.reply(Api.papagoTranslate("ko", "en", KorE));
                }
                else if (regex_en.test(KorE)) {
                    replier.reply(Api.papagoTranslate("en", "ko", KorE));
                }
                else {
                    replier.reply("한글 또는 영어만 넣어주세요.");
                }
            }
            //=================== json file 초기화 ================ ##99
            else if (msg.startsWith("/초기화")) {
                let clear = msg.substring(5).trim();

                //replier.reply(clear);
                if (clear === "채팅") {
                    FileStream.remove(LOG_FILE_PATH);
                    replier.reply("✅ 모든 채팅 로그 데이터가 초기화되었습니다.");
                } else if (clear === "에러") {
                    FileStream.remove(DB_MSG_PATH);
                    replier.reply("✅ 모든 에러 데이터가 초기화되었습니다.");
                } else if (clear === "등록") {
                    FileStream.remove(SETTINGS_FILE_PATH);
                    replier.reply("✅ 모든 방등급 데이터가 초기화되었습니다.");
                }

                return; // 명령어 처리 후 함수 종료
            }
            //=================== json 파일보기 ==================== ##3
            else if (msg.startsWith("/파일 ")) {
                // 1. 관리자 권한 확인
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 이 명령어는 관리자만 사용할 수 있습니다.");
                    return;
                }

                // 2. 명령어 파싱
                const args = msg.split(" ");
                const fileName = args[1];
                const mode = msg.substring(8).trim();
                //const mode = args[2] || "tail"; // 기본값은 'tail' (파일의 뒷부분)

                if (fileName.text === "" || fileName === null) {
                    replier.reply(
                        "올바른 파일명을 입력해주세요.\n" +
                        " [사용법]\n" +
                        " - /파일 [채팅]: 채팅 이력 조회\n" +
                        " - /파일 [에러]: 잘못된 명령어 횟수 조회"
                    );
                    return;
                }

                // 3. 파일 경로 조합 및 읽기
                var fileNameChg = "";
                if (fileName === "채팅") {
                    fileNameChg = 'chat_log.json';
                } else if (fileName === "에러") {
                    fileNameChg = 'message.json';
                } else if (fileName === "ㅊㅊ") {
                    fileNameChg = escapeJsonString(mode) + "_attendance.json";
                } else if (fileName === "등급") {
                    fileNameChg = 'room_settings.json';
                } else {
                    replier.reply("잘못된 파일명 입니다.");
                    return;
                }

                const filePath = DB_BASE_PATH + fileNameChg;

                try {
                    const fileContent = FileStream.read(filePath);

                    if (!fileContent) {
                        replier.reply("❌ 파일을 찾을 수 없습니다.\n경로: " + filePath);
                        return;
                    }

                    const lines = fileContent.split('\n');
                    const totalLines = lines.length;
                    let previewLines;
                    let previewModeStr = "";

                    // 4. head 또는 tail 로직 처리
                    if (mode.includes('head')) {
                        previewLines = lines.slice(0, MAX_LINES_TO_SHOW);
                        previewModeStr = "앞부분";
                    } else {
                        previewLines = lines.slice(-MAX_LINES_TO_SHOW); // 배열의 맨 뒤에서부터 잘라냄
                        previewModeStr = "뒷부분";
                    }

                    // 5. 결과 메시지 생성 및 전송
                    let result = "📄 [" + fileNameChg + "] 파일 내용 (" + previewModeStr + ")\n";
                    result += "(총 " + totalLines + "줄 중 " + previewLines.length + "줄 표시)\n";
                    result += "─────────────────\n";
                    // 마크다운 코드 블록으로 감싸서 가독성 향상
                    result += "json\n";
                    result += previewLines.join('\n').trim();
                    result += "\n";

                    replier.reply(result);

                } catch (e) {
                    Log.e("파일 읽기 오류: " + e);
                    replier.reply("파일을 읽는 중 오류가 발생했습니다.");
                }
            }
            //=================== 컴파일 ========================== ##3
            else if (msg.startsWith("/컴파일 ")) {
                let scriptName = msg.substring(5).trim();
                Api.reload(scriptName);
                if (Api.isCompiled(scriptName)) {
                    replier.reply("[" + scriptName + "] 컴파일 완료");
                }
                return;
            }
            else if (msg === ("/컴파일")) {
                Api.reload();
                if (Api.isCompiled()) {
                    replier.reply("모든 스크립트 컴파일 완료");
                }
                return;
            }
            //=================== 가비지컬렉션 실행 ================== ##3
            else if (msg === "/gc") {
                Api.gc();
                replier.reply("가비지컬렉션 완료");
            }
            //=================== 방 등급제 실행 ==================== ##4
            else if (msg.startsWith("/등급 ")) {
                // 1. 권한 확인
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 [" + sender + "]님은 이 명령어를 사용할 권한이 없습니다.");
                    return; // 함수 종료
                }

                // 2. 명령어 파싱
                let parts = msg.split(" "); // 공백으로 메시지를 나눔
                // ex: "/등급 등급 방이름" -> ["/등급", "등급", "방이름"]

                if (parts.length < 3) {
                    replier.reply("⚠️ 사용법이 잘못되었습니다.\n/등급 [등급] [방이름]");
                    return;
                }

                const grade = parts[1];
                let roomName = msg.substring(6).trim();

                try {
                    // 3. 데이터베이스 로드 및 수정
                    let db = loadDatabase(SETTINGS_FILE_PATH);
                    db[roomName] = grade; // 방 이름에 등급을 할당 (기존에 있으면 덮어쓰기)

                    // 4. 데이터베이스 저장
                    saveDatabase(SETTINGS_FILE_PATH, db);

                    // 5. 성공 피드백
                    const responseMsg = "✅ 등록 완료\n" +
                        "방 이름: " + roomName + "\n" +
                        "등 급: " + grade;
                    let msgContext = "방 등급이 Lv." + grade + " 으로 설정되었습니다.";
                    Api.replyRoom(roomName, msgContext, false);
                    replier.reply(responseMsg);

                } catch (e) {
                    replier.reply("❗ 처리 중 오류가 발생했습니다.");
                    Log.e("방 등록 중 오류: " + e);
                }
            }
            else if (msg.startsWith("/등급조회 ")) {
                let parts = msg.split(" ");
                if (parts.length < 2) {
                    replier.reply("⚠️ 사용법: /조회 [방이름]");
                    return;
                }
                let roomName = parts[1];
                let db = loadDatabase(SETTINGS_FILE_PATH);

                if (db[roomName]) {
                    replier.reply("🔍 [" + roomName + "] 방의 등급은 [" + db[roomName] + "] 입니다.");
                } else {
                    replier.reply("❓ [" + roomName + "] 방은 등록되어 있지 않습니다.");
                }
            }
            else if (msg === "/등급조회") {
                let db = loadDatabase(SETTINGS_FILE_PATH);
                const roomNames = Object.keys(db);

                if (roomNames.length === 0) {
                    replier.reply("📭 등록된 방이 없습니다.");
                    return;
                }

                let listMsg = "📋 전체 등록된 방 목록\n\n";
                roomNames.forEach(name => {
                    listMsg += "- " + name + " : " + db[name] + "\n";
                });

                replier.reply(listMsg.trim());
            }
            //=================== 비율 조정 명령어 ================== ##5
            else if (msg.startsWith("/비율 ")) {
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 관리자 전용 명령어입니다.");
                    return;
                }
                let parts = msg.split(" ");
                if (parts.length < 4) {
                    replier.reply("사용법: /비율 [게임명] [비율(숫자)] [방이름]");
                    return;
                }
                const gameName = parts[1].toLowerCase();
                const weight = parts[2];
                let room = parts[3];

                if (!GAME_LIST.includes(gameName)) {
                    replier.reply('잘못된 대상입니다. (' + GAME_LIST.join(', ') + ')');
                    return;
                }

                if (isNaN(weight) || weight < 0) {
                    replier.reply("비율은 0 이상의 숫자여야 합니다.");
                    return;
                }

                let settings = loadDatabase(GAME_SETTINGS_PATH);
                if (!settings[room]) settings[room] = {};
                settings[room][gameName] = weight;
                saveDatabase(GAME_SETTINGS_PATH, settings);

                replier.reply('[' + room + '] 방의 [' + gameName + '] 게임 등장 비율이 ' + weight + '으로 설정되었습니다.');
                return; // 비율 설정 후 다른 로직 실행 방지
            }
            else if (msg.startsWith("/비율확인 ")) {
                if (!ADMIN_NAME.includes(sender)) return;
                let settings = loadDatabase(GAME_SETTINGS_PATH);

                let parts = msg.split(" ");
                let room = parts[1];
                let roomSettings = settings[room] || {};
                let totalWeight = 0;
                let result = '방의 현재 게임 비율\n\n';

                GAME_LIST.forEach(game => {
                    const weight = roomSettings[game] === undefined ? 1 : roomSettings[game];
                    totalWeight += weight;
                    result += '- ' + game + ': ' + weight + '\n';
                });

                result += "\n--- 예상 확률 ---\n";
                GAME_LIST.forEach(game => {
                    const weight = roomSettings[game] === undefined ? 1 : roomSettings[game];
                    const percentage = totalWeight > 0 ? (weight / totalWeight * 100).toFixed(1) : 0;
                    result += '- ' + game + ': ' + percentage + '%\n';
                });

                replier.reply(result);
                return;
            }
            //=================== 게임등록 명령어 ================== ##6
            else if (msg === "/초성") {
                let gameList = loadDatabase(DB_BASE_PATH + CHOSUNG_QUIZ);
                if (gameList.length === 0) { replier.reply("등록된 초성 퀴즈가 없습니다!"); return; }

                let result = "[등록된 초성 퀴즈 목록 (" + gameList.length + "개)]\n\n";

                gameList.forEach((game, index) => {
                    result += (index + 1) + ". 문제: " + game.answer + " /힌트: " + game.hint + "\n";
                });

                // 카카오톡 글자 수 제한(4000자) 처리
                if (result.length > 4000) {
                    replier.reply("퀴즈 목록이 너무 길어 일부만 표시합니다.\n\n" + result.substring(0, 3900));
                } else {
                    replier.reply(result.trim());
                }

                return;
            }
            else if (msg.startsWith("/초성추가 ")) {
                let content = msg.substring(6).trim();
                let lastSpaceIndex = content.lastIndexOf(' ');

                let answer = '';
                let hint = '';

                if (lastSpaceIndex === -1 || lastSpaceIndex === 0) {
                    lastSpaceIndex = content.length;
                    hint = "";
                } else {
                    hint = content.substring(lastSpaceIndex + 1).trim();
                }

                answer = content.substring(0, lastSpaceIndex).trim();

                gameMaker(CHOSUNG_QUIZ, replier, answer, hint);

                return;
            }
            else if (msg.startsWith("/초성삭제 ")) {
                const wordToDelete = msg.substring(6).trim();
                if (!wordToDelete) {
                    replier.reply("삭제할 단어를 입력해주세요.\n(예: /초성삭제 미국)");
                    return;
                }

                gameDelete(CHOSUNG_QUIZ, wordToDelete, replier);

                return; // 명령어 처리 후 종료
            }
            else if (msg === "/넌센스") {
                let gameList = loadDatabase(DB_BASE_PATH + NONSENSE_QUIZ);
                if (gameList.length === 0) { replier.reply("등록된 넌센스 퀴즈가 없습니다!"); return; }

                let result = "[등록된 넌센스 퀴즈 목록 (" + gameList.length + "개)]\n\n";

                gameList.forEach((game, index) => {
                    result += (index + 1) + ". 문제: " + game.answer + " /힌트: " + game.hint + "\n";
                });

                // 카카오톡 글자 수 제한(4000자) 처리
                if (result.length > 4000) {
                    replier.reply("퀴즈 목록이 너무 길어 일부만 표시합니다.\n\n" + result.substring(0, 3900));
                } else {
                    replier.reply(result.trim());
                }

                return;
            }
            else if (msg.startsWith("/넌센스추가 ")) {
                let content = msg.substring(7).trim();
                let lastSpaceIndex = content.lastIndexOf(' ');

                if (lastSpaceIndex === -1 || lastSpaceIndex === 0) {
                    replier.reply("사용법: /넌센스 [정답] [문제]\n예시: /넌센스추가 킹콩 왕이 넘어지면?");
                    return;
                }

                let answer = content.substring(0, lastSpaceIndex).trim();
                let question = content.substring(lastSpaceIndex + 1).trim();

                let quizList = loadDatabase(BASE_PATH + NONSENSE_QUIZ);

                if (quizList.some(q => q.answer === answer && q.question === question)) {
                    replier.reply("이미 등록된 넌센스 퀴즈입니다.");
                    return;
                }

                quizList.push({ question: question, answer: answer });
                saveDatabase(BASE_PATH + NONSENSE_QUIZ, quizList);

                replier.reply('✅ 넌센스퀴즈 [정답: ' + answer + ']가 성공적으로 등록되었습니다!');
                return;
            }
            else if (msg.startsWith("/이모지")) {
                let gameList = loadDatabase(DB_BASE_PATH + EMOTION_QUIZ);
                if (gameList.length === 0) { replier.reply("등록된 이모지 퀴즈가 없습니다!"); return; }

                let result = "[등록된 이모지 퀴즈 목록 (" + gameList.length + "개)]\n\n";

                gameList.forEach((game, index) => {
                    result += (index + 1) + ". 문제: " + game.emotion + " /정답: " + game.answer + " /힌트: " + game.hint + "\n";
                });

                // 카카오톡 글자 수 제한(4000자) 처리
                if (result.length > 4000) {
                    replier.reply("퀴즈 목록이 너무 길어 일부만 표시합니다.\n\n" + result.substring(0, 3900));
                } else {
                    replier.reply(result.trim());
                }

                return;
            }
            //=================== 공지 등록/삭제 기능 ============== ## 7
            else if (msg.startsWith("/공지등록 ")) {
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 관리자 전용 명령어입니다.");
                    return;
                }

                let noticeContent = msg.substring(6).trim();
                if (!noticeContent) {
                    replier.reply("등록할 공지 내용을 입력해주세요.");
                    return;
                }

                let announcements = loadDatabase(ANNOUNCEMENT_PATH);
                announcements["global"] = noticeContent;
                saveDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH, announcements);

                replier.reply("✅ 전체 공지가 성공적으로 등록되었습니다.");
                return;
            }
            else if (msg.startsWith("/방공지등록 ")) {
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 관리자 전용 명령어입니다.");
                    return;
                }
                let roomName = msg.split(' ')[1];

                let noticeContent = msg.substring(7 + roomName.length).trim();
                if (!noticeContent) {
                    replier.reply("등록할 공지 내용을 입력해주세요.");
                    return;
                }

                let announcements = loadDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH);
                announcements[roomName] = noticeContent; // 현재 방 이름을 키로 사용
                saveDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH, announcements);

                replier.reply("✅ [" + roomName + "] 방의 전용 공지가 등록되었습니다.");
                Api.replyRoom(roomName, "방 공지가 등록되었습니다.", false);
                return;
            }
            if (msg.startsWith("/방공지삭제 ")) {
                if (!ADMIN_NAME.includes(sender)) {
                    replier.reply("🚫 관리자 전용 명령어입니다.");
                    return;
                }
                let roomName = msg.split(' ')[1];

                let announcements = loadDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH);
                if (announcements[roomName]) {
                    delete announcements[roomName]; // 현재 방 공지 삭제
                    saveDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH, announcements);
                    replier.reply("🗑️ [" + roomName + "] 방의 전용 공지가 삭제되었습니다.");
                } else {
                    replier.reply("이 방에는 등록된 전용 공지가 없습니다.");
                }
                return;
            }
            //=================== 메세지 보내기 =================== ##8
            else if (msg.startsWith("/채팅 ")) {
                let roomName = msg.split(' ')[1];
                let msgContext = "[공지] " + msg.substring(4 + roomName.length).trim();
                if (Api.replyRoom(roomName, msgContext, false)) {
                    replier.reply("✅ [" + roomName + "] 에 메세지를 전송했습니다.\n" + msgContext);
                } else {
                    replier.reply("❌ [" + roomName + "] 에 메세지 전송에 실패했습니다.");
                }
            }
            //=================== 이미지 테스트 =================== ##0
            else if (msg.startsWith("/사진")) {
                let imgPath = "https://mblogthumb-phinf.pstatic.net/MjAyMTA4MDRfMjUz/MDAxNjI4MDM5MzY1MzU1.SU_FuwwCvRJnzV92iM5iZaGFIw9mVmM7Epp7tbxHBwgg.wlX_4OB5DD4DKk7nKFuSeowdIjNWqloXq3jV_UpDc6Qg.JPEG.kimjin8946/7.jpg?type=w800";
                let result = getSize(imgPath);
                while (!(--result[0] <= 800 && --result[1] <= 800)) { };
                while (!(++result[0] >= 800 || ++result[1] >= 800)) { };
                sendImg(room, msg.slice(4), result[0], result[1]);
            }
            //=================== 관리자 명령어 =================== ##0
            else if (msg.startsWith("/관리자")
                || msg.startsWith("/고나리자")
                || msg.startsWith("/admin")) {
                retMsg = "현재 사용 가능한 명령어는 다음과 같습니다.";
                retMsg += "\n  [r]:방이름, [s]:스크립트, [f]:파일명,\n  [v]:비율,  [g]:게임, [a]:정답, [h]: 힌트";
                retMsg += "\n\n🔴 /끄기 [s] : 스크립트 [특정] 종료";
                retMsg += "\n🟢 /켜기 [s] : 스크립트 [특정] 시작";
                retMsg += "\n✏️ /스크립트    : 실행중인 스크립트";
                retMsg += "\n📂 /파일  [f] [head/tail]: json 파일내용 조회";
                retMsg += "\n🔃 /초기화 [f]: json 파일 삭제(초기화)";
                retMsg += "\n💭 /컴파일 [s]: 스크립트 [특정] 컴파일";
                retMsg += "\n🗑 /gc        : 가비지 컬렉팅";
                retMsg += "\n🛠️ /환경       : 메신저봇 구축 환경 정보";
                //retMsg += "\n🔠 /번역 : 한영 변환";
                retMsg += "\n⭐️ /등급(조회) [r] : 방 등급 설정(조회)";
                //retMsg += "\n🔍 /등급조회 [r] : 등록된 방 등급 설정";
                //retMsg += "\n⭐️ /비율(조회) [g] [v] [r] : 방기능 비율 등록(조회)";
                //retMsg += "\n  [g]: " + GAME_LIST.join(',');
                //retMsg += "\n🔍 /비율조회 [r] : 방 내부기능 등록조회";
                retMsg += "\n\n🔍 /초성 : 초성문제 조회";
                retMsg += "\n➕ /초성추가 [a] [h] : 초성문제 추가(힌트는 한 단어만 입력 바람)";
                retMsg += "\n🗑️ /초성삭제 [a]: 초성문제 삭제"
                retMsg += "\n🔍 /넌센스 : 넌센스문제 조회";
                retMsg += "\n🔍 /이모지 : 이모티콘문제 조회";
                retMsg += "\n📢 /(방)공지[등/삭제] : 공지글 등록/삭제";
                replier.reply(retMsg);
                return; // 명령어 처리 후 함수 종료
            }
        }
    } catch (e) {
        Api.makeNoti("오류 발생!", "내용 : " + e);
        replier.reply(e);
    }
}