/**
 * 파일명: chtbot.js
 * 설명: 카카오톡 챗봇 (AI가 항상 한국어로 답변하도록 수정)
 * 작성자: Watson
 * 버전: 1.1.7.
 * 업데이트 이력
 * * * [ver 1.1.1.] 20250625 프로젝트 생성, 관리자 명령어                        (##0)
 * * * [ver 1.1.2.] 20250625 스크립트 On/Off 기능 추가, 실행중인 스크립트 리스트 조회 (##1)
 * * * [ver 1.1.3.] 20250702 컴파일, 환경, gc 기능 추가                        (##2)
 * * * [ver 1.1.4.] 20250708 json file 내용 조회 추가                         (##3)
 * * * [ver 1.1.5.] 20250700 파파고 번역 추가 (##99)
 * * * [ver 1.1.6.] 20250717 채팅방 등급제 및 포인트제 도입                      (##4)
 * * * [ver 1.1.7.] 20250721 방 비율 조정 기능 추가                            (##5)
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
const BASE_PATH = "sdcard/msgbot/database/";
const DB_PATH = BASE_PATH + "attendance.json";// 출석체크 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const DB_MSG_PATH = BASE_PATH + "message.json";// 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
//const LOG_FILE_PATH = BASE_PATH + "chat_log.json";// 채팅 이력 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const SETTINGS_FILE_PATH = BASE_PATH + "room_settings.json";
const GAME_SETTINGS_PATH = BASE_PATH + "quiz/game_settings.json";
const ADMIN_NAME = ["정승환", "DEBUG SENDER"]; // 출석부 초기화 권한을 가질 관리자 이름

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
function saveDatabase(db, dbName) {
    // 자바스크립트 객체를 예쁘게 포맷된 JSON 문자열로 변환
    const dataString = JSON.stringify(db, null, 2);
    FileStream.write(dbName, dataString);
}

// 게임 목록 (관리 및 설정에 사용)
const GAME_LIST = ['업다운', '문장', '초성', 'sqld'];

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
                // 앱 구동 환경의 안드로이드 버전 코드를 반환합니다.
                //              let androidVersion = Utils.getAndroidVersionCode().text();

                // 앱 구동 환경의 안드로이드 버전 이름을 반환합니다.
                let androidName Utils.getAndroidVersionName();

                // 앱 구동 환경의 휴대폰 브랜드명을 반환합니다.
                let mobileBrand = Utils.getPhoneBrand();

                // 앱 구동 환경의 휴대폰 모델명을 반환합니다.
                let mobileName = Utils.getPhoneModel();

                //             setupTxt += ' * 안드로이드 버전: ' + androidVersion.text() + '\n';
                setupTxt += ' * 안드로이드 버전명: ' + androidName + '\n';
                setupTxt += ' * 기기 브랜드명: ' + mobileBrand + '\n';
                setupTxt += ' * 기기 모델명: ' + mobileName;
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

                const filePath = BASE_PATH + fileNameChg;

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
                reload(scriptName);
                if (isCompiled(scriptName)) {
                    replier.reply("[" + scriptName + "] 컴파일 완료");
                }
                return;
            }
            else if (msg === ("/컴파일")) {
                reload();
                if (isCompiled()) {
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
                    saveDatabase(db, SETTINGS_FILE_PATH);

                    // 5. 성공 피드백
                    const responseMsg = "✅ 등록 완료\n" +
                        "방 이름: " + roomName + "\n" +
                        "등 급: " + grade;
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
                saveDatabase(settings, GAME_SETTINGS_PATH);

                replier.reply('[' + room + '] 방의 [' + gameName + '] 게임 등장 비율이 ' + weight + '으로 설정되었습니다.');
                return; // 비율 설정 후 다른 로직 실행 방지
            }
            else if (msg.startsWith("/비율확인 ")) {
                if (!ADMIN_NAME.includes(sender)) return;
                let parts = msg.split(" ");
                let room = parts[1];
                let settings = loadDatabase(GAME_SETTINGS_PATH);
                
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
            //=================== 관리자 명령어 =================== ##0
            else if (msg.startsWith("/관리자")
                || msg.startsWith("/고나리자")
                || msg.startsWith("/admin")) {
                retMsg = "현재 사용 가능한 명령어는 다음과 같습니다.\n  [r]:방이름, [s]:스크립트, [f]:파일명,\n\t[v]:비율, [g]:게임";
                retMsg += "\n\n🔴 /끄기 [s] : 스크립트 [특정] 종료";
                retMsg += "\n🟢 /켜기 [s] : 스크립트 [특정] 시작";
                retMsg += "\n✏️ /스크립트    : 실행중인 스크립트";
                retMsg += "\n📂 /파일  [f] [head/tail]: json 파일내용 조회";
                retMsg += "\n🔃 /초기화 [f]: json 파일 삭제(초기화)";
                retMsg += "\n💭 /컴파일 [s]: 스크립트 [특정] 컴파일";
                retMsg += "\n🗑 /gc        : 가비지 컬렉팅";
                retMsg += "\n🛠️ /환경       : 메신저봇 구축 환경 정보";
                retMsg += "\n🔠 /번역 : 한영 변환";
                retMsg += "\n⭐️ /등급    [r] : 방 등급 설정";
                retMsg += "\n🔍 /등급조회 [r] : 등록된 방 등급 설정";
                retMsg += "\n⭐️ /비율 [g] [v] [r] : 방 내부기능 비율 등록";
                retMsg += "\n  [g]: " + GAME_LIST.join(', ');
                retMsg += "\n🔍 /비율조회 [r] : 방 내부기능 등록조회";
                replier.reply(retMsg);
                return; // 명령어 처리 후 함수 종료
            }
        }
    } catch (e) {
        Api.makeNoti("오류 발생!", "내용 : " + e);
        replier.reply(e);
    }
}