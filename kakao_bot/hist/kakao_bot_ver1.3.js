/**
 * 파일명: chtbot.js
 * 설명: 카카오톡 챗봇 (AI가 항상 한국어로 답변하도록 수정)
 * 작성자: Watson
 * 버전: 1.3.2
 * 업데이트 이력
 * * * [ver 1.1.1.] 20250609 프로젝트 생성
 * * * [ver 1.1.2.] 20250610 날씨조회 기능 추가 (##1)
 * * * [ver 1.1.3.] 20250610 AI검색 기능 추가  (##2)
 * * * [ver 1.2.1.] 20250616 기존 로직 개선
 * * * [ver 1.2.2.] 20250618 출석체크 및 명령어 기능 추가 (##3)
 * * * [ver 1.2.3.] 20250619 이스터에그 추가           (##4)
 * * * [ver 1.2.4.] 20250619 내정보 타인정보 조회 추가   (##5)
 *                  20250620 메신저봇R device 이슈로 공장초기화
 * * * [ver 1.3.1.] 20250624 날씨 크롤링 데이터 개선
 * * * [ver 1.3.2.] 20250625 SQLite 적용             (##6)
 * * * [ver 1.3.3.] 20250630 전국 현재 날씨 조회 적용    (##7)
 */

// Java 라이브러리 import
const Jsoup = org.jsoup.Jsoup;
const URL = java.net.URL;
const HttpURLConnection = java.net.HttpURLConnection;
const BufferedReader = java.io.BufferedReader;
const InputStreamReader = java.io.InputStreamReader;
const OutputStreamWriter = java.io.OutputStreamWriter;
const SQLiteDB = android.database.sqlite.SQLiteDatabase;
const SQLiteHelper = android.database.sqlite.SQLiteOpenHelper;

// ==================== [SET] 선언부 ====================
// 1단계에서 발급받은 Gemini API 키
const GEMINI_API_KEY = "AIzaSyBzt3HzlenXzZZZ_S_lbLV704XWLqr3I64";
const ADMIN_NAME = "정승환"; // 출석부 초기화 권한을 가질 관리자 이름
const MAX_ERROR_COUNT = 5;  // 잘못된 명령어를 입력했을 때, 이스터에그가 발동하기 위한 횟수

//const DB_PATH = "sdcard/msgbot/database/attendance.json";// 출석체크 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
//const DB_MSG_PATH = "sdcard/msgbot/database/message.json";// 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
//const LOG_FILE_PATH = "sdcard/msgbot/database/chat_log.json";// 채팅 이력 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
//const SETTINGS_FILE_PATH = "sdcard/msgbot/database/room_settings.json";
// =======================================================

// ==================== [DB] 설정 부분 STRT ===================
const DB_NAME     = "chkbot.db"; // ChatBot DB
const TB_CHK_NAME = "check";     // 출석체크 DB
const TB_SCH_NAME = "schedule";  // 일정관리 DB
const TB_CHT_NAME = "chat";      // 채팅이력 DB
const TB_PNT_NAME = "point";     // 점수 DB
// 데이터베이스 파일 경로 설정
const DB_PATH = FileStream.getDatabasePath(DB_NAME).getAbsolutePath();

/*
 * DataBase.setDataBase(String fileName, String content)    //파일에 데이터를 덮어씁니다.(이거는 데이터가 이어서 붙여지지 않습니다)
 * DataBase.getDataBase(String fileName)                    //파일에 데이터를 불러옵니다
 * DataBase.removeDataBase(String fileName)                 //파일을 삭제합니다
 * DataBase.appendDataBase(String fileName, String content) //파일에 데이터를 이어붙입니다
 *

/* 앱_데이터_폴더/Database 폴더 내에 fileName이라는 파일을 만들고, data 문자열을 덮어씁니다.
 * fileName에 확장자가 명시되지 않은 경우 확장자는 자동으로 .txt가 됩니다.
 * 최종 파일 내용을 반환합니다. */
//String DataBase.setDataBase(String fileName, String data)

// 앱_데이터_폴더/Database/fileName 파일을 읽어 내용을 문자열로 반환합니다.
//String DataBase.getDataBase(String fileName)

// 앱_데이터_폴더/Database/fileName파일에 data를 이어씁니다. 최종 파일 내용을 반환합니다.
//String DataBase.appendDataBase(String fileName, String data)

/* 앱_데이터_폴더/Database/fileName 파일을 삭제합니다.
 * 앱 옵션에서 삭제시 백업기능을 켜두었을 경우, fileName.bak으로 내용이 백업됩니다.
 * java.io.File.delete()의 결과를 반환합니다. */
//Boolean DataBase.removeDataBase(String fileName)


function getDataBaseSetUp() {
    // 1. 데이터베이스 및 테이블 초기화 (없으면 생성)
    try {
        let db = DB.open(DB_PATH);
        db.execute(     // 1-1. 출첵
            "CREATE TABLE IF NOT EXISTS " + TB_CHK_NAME + " (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "room_name TEXT, " +
            "user_name TEXT, " +
            "checkIn_date TEXT " +
            ");"
        );
        db.execute(     // 1-2. 일정관리
            "CREATE TABLE IF NOT EXISTS " + TB_SCH_NAME + " (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "room_name TEXT, " +
            "user_name TEXT, " +
            "schedule_date TEXT, " +
            "content TEXT" +
            ");"
        );
        db.execute(     // 1-3. 채팅이력
            "CREATE TABLE IF NOT EXISTS " + TB_CHT_NAME + " (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "room_name TEXT, " +
            "user_name TEXT, " +
            "content TEXT" +
            ");"
        );
        db.execute(     // 1-4. 점수
            "CREATE TABLE IF NOT EXISTS " + TB_LOG_NAME + " (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "user_name TEXT, " +
            "point INTEGER" +
            ");"
        );
        db.close();
    } catch (e) {
        Log.e("DB 초기화 실패: " + e);
        replier.reply("데이터베이스 초기화에 실패했습니다.");
        return;
    }
}

function setDataBaseSetUp(fileName, data) {
    let setDB = '';
    try {
        setDB = DataBase.setDataBase(fileName, data);
    } catch (e) {
        replier.reply(e);
    }

    return setDB;
}
function getDataBaseSetUp(fileName, data) {
    let getDB = '';
    try {
        getDB = DataBase.getDataBase(fileName);
    } catch (e) {
        replier.reply(e);
    }

    return getDB;
}
    // (실제 사용 시에는 Cursor를 사용하여 데이터를 처리해야 합니다.)
    public void getData() {
    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.query(TABLE_NAME, null, null, null, null, null, null);
    cursor.close();
}

//function getDatabaseTestSetUp() {
//    @Override
//    public void onCreate(SQLiteDatabase db) {
//        String createTableQuery = "CREATE TABLE " + TABLE_NAME + " (" +
//            COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
//            COLUMN_NAME + " TEXT)";
//        db.execSQL(createTableQuery);
//    }

//    @Override
//    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
//        db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
//        onCreate(db);
//    }

//    // 데이터 삽입 예시
//    public long insertData(String name) {
//        SQLiteDatabase db = this.getWritableDatabase();
//        ContentValues values = new ContentValues();
//        values.put(COLUMN_NAME, name);
//        return db.insert(TABLE_NAME, null, values);
//    }

//    // 데이터 조회 예시
//    // (실제 사용 시에는 Cursor를 사용하여 데이터를 처리해야 합니다.)
//    public void getData() {
//        SQLiteDatabase db = this.getReadableDatabase();
//        Cursor cursor = db.query(TABLE_NAME, null, null, null, null, null, null);
//        cursor.close();
//    }
//}
// ==================== [DB] 설정 부분 END ====================


// ==================== [FUNC] 날짜 설정 STRT =================
// 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환하는 함수
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// 어제 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환하는 함수
function getYesterdayDateString() {
    const today = new Date();
    const yesterday = new Date(today.setDate(today.getDate() - 1));
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// ==================== [FUNC] 날짜 설정 END ==================


// ==================== [FUNC] 날씨 설정 STRT ================= ##1
function getWeatherSearch(location, replier) {
    const url = "https://search.naver.com/search.naver?query=" + encodeURI(location + " 날씨");
    const doc = Jsoup.connect(url).userAgent("Mozilla/5.0").get();

    let result = '';
    var chkNum = 0;
    // ##1-1. 전국 날씨 조회할 경우
    if (location === "전국") {
        let countryNow = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(1) > div.lcl_lst > a > span");
        let countryAm = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(2) > div.lcl_lst > a > span");
        let countryPm = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(3) > div.lcl_lst > a > span");
        if (countryNow == null) {
            replier.reply("전국 오후 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryAm == null) {
            replier.reply("전국 오전 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryPm == null) {
            replier.reply("전국 오후 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        }

        result = '\t 현재( 오전 : 오후 )\n';

        for (let i = 0; i < countryNow.length; i++) {
            if (i % 4 == 0) {
                if (countryNow[i].text() == '울릉/독도') {
                    result += '* 울릉: ';
                }
                else {
                    result += '* ' + countryNow[i].text() + ': ';
                }
            }
            else if (i % 4 == 3) {
                result += getWeatherIcon(countryNow[i].text()) + '(' + getWeatherIcon(countryAm[i].text()) + '➠' + getWeatherIcon(countryPm[i].text()) + ')\n';
            }
        }

    }
    // ##1-2. 특정 지역날씨 조회할 경우
    else {
        // 현재 위치 (예: "서울특별시 용산구 한강대로")
        const currentLoc = doc.select("h2.title").first().text();
        if (currentLoc == null) {
            replier.reply("지역 정보가 잘못되었습니다. 😥\n '" + location + "'이(가) 맞는지 다시 확인해주세요.");
            return;
        }
        const currentTemp = doc.select("div.temperature_text > strong").first().text().replace("현재 온도", "").trim();

        try {
            const weatherDesc = doc.select("div._today > div.temperature_info > p.summary").first().text();
        } catch (e) {
            weatherDesc = null;
        }

        const summaryList = doc.select("dl.summary_list > div.sort > dd.desc");

        const sensibleTemp = summaryList.get(0).text();        // 체감 온도
        const humidity = summaryList.get(1).text();        // 습도
        const wind = summaryList.get(2).text();        // 풍속

        // 미세먼지, 초미세먼지 정보
        const dustInfo = doc.select("ul.today_chart_list > li > a > span.txt");
        const fineDust = dustInfo.get(0).text();        // 미세먼지
        const ultraFineDust = dustInfo.get(1).text();        // 초미세먼지
        // 시간대별 강수확률 (가장 가까운 시간대 정보 가져오기)
        // 시간별 예보 테이블에서 첫 번째 행의 강수확률을 가져옵니다.
        const rainProbHeader = doc.select("th > span.rainfall").first();        // "강수" 헤더
        let rainProbability = "정보 없음";
        if (rainProbHeader != null) {
            // "강수" 헤더가 있는 행(tr)을 찾아, 그 행의 첫 번째 데이터(td)의 값을 가져옴
            rainProbability = rainProbHeader.parent().parent().nextElementSibling().select("td > span.rainfall").first().text();
        }

        const _tomorrow = doc.select('div.weather_info.type_tomorrow > div.status_wrap > ul.weather_info_list._tomorrow > li');
        const _tmw_am = _tomorrow.get(0).select('div.temperature_info').text();
        const _tmw_pm = _tomorrow.get(1).select('div.temperature_info').text();

        const yesterDayTemp = weatherDesc.split(" ")[0] + " " + weatherDesc.split(" ")[1] + " " + weatherDesc.split(" ")[2];  // 예: 어제보다 23.5℃ 낮아요
        const weatherState = weatherDesc.split(" ")[3];  // 예: 흐림
        const weatherIcon = getWeatherIcon(weatherState);

        let clothingTip = "";
        let rain = false;
        try {
            // '23.5°' 같은 문자열에서 숫자 부분만 추출
            const tempNum = parseFloat(currentTemp.replace("\xb0", ""));
            if (weatherState.includes("비") || weatherState.includes("소나기") || weatherState.includes("뇌우")) rain = true;
            if (!isNaN(tempNum)) {
                // 숫자로 변환이 성공했을 경우에만 실행
                clothingTip = getClothingRecommendation(tempNum, rain);
            }
        } catch (e) {
            // 온도 파싱 중 오류 발생 시 아무것도 하지 않음
        }

        result = "📍 [" + currentLoc + "] 날씨 정보\n";
        result += "====================\n";
        result += "🌡️ 날씨: " + weatherIcon + "(" + weatherState + ")\n";
        result += "  - 온도(체감): " + currentTemp + "(" + sensibleTemp + ")\n";
        result += "    ➜ " + yesterDayTemp + "\n";
        result += "  - 풍속: " + wind + "\t - 습도: " + humidity + "\n\n";
        result += "😷 대기 정보\n";
        result += "  - 미세먼지: " + fineDust + "\t";
        result += "  - 초미세먼지: " + ultraFineDust + "\n\n";
        result += "💧 예상 강수 확률\n";
        result += "  - " + rainProbability + "\n\n";
        // 옷차림 추천 문구가 있을 경우에만 결과에 추가
        if (clothingTip !== "") {
            result += "👕 오늘의 옷차림 추천\n";
            result += "  - " + clothingTip + "\n\n";
        }

        result += "[내일 날씨]";
        result += "\n* 오전: " + _tmw_am;
        result += "\n* 오후: " + _tmw_pm;
        result += "\n자료: 네이버 날씨";
    }

    return result;
}


/** // ==================== 옷차림 추천 함수 ====================
 * 기온에 따라 옷차림을 추천하는 문구를 반환합니다.
 * @param {number} temp - 현재 기온 (숫자)
 * @returns {string} - 옷차림 추천 문구
 */
function getClothingRecommendation(temp, rain) {
    let returnTxt = '';
    //기온에 따른 복장
    if (temp >= 28) {
        returnTxt = "민소매, 반바지, 원피스를 추천해요. 더위 조심하세요!";
    } else if (temp >= 23) {
        returnTxt = "반팔, 얇은 셔츠, 반바지, 면바지가 좋겠어요.";
    } else if (temp >= 17) {
        returnTxt = "얇은 긴팔이나 가디건, 맨투맨, 청바지가 알맞아요.";
    } else if (temp >= 12) {
        returnTxt =  "자켓, 가디건, 야상, 니트, 스타킹을 챙기세요.";
    } else if (temp >= 9) {
        returnTxt = "트렌치코트, 야상, 니트, 기모 후드티가 필요한 날씨예요.";
    } else if (temp >= 5) {
        returnTxt = "코트, 가죽자켓, 히트텍, 니트 등 따뜻하게 입으세요.";
    } else {
        returnTxt = "패딩, 두꺼운 코트, 목도리, 장갑은 필수! 감기 조심하세요.";
    }

    if (rain == true) returnTxt += "\n비가 올 수 있어요. ☔ 우산을 챙기세요."
    return returnTxt;
}

/**
 * 날씨 예보 텍스트를 적절한 이모티콘으로 변환합니다.
 * @param {string} wf - 날씨 예보 (예: "맑음", "구름많음")
 * @returns {string} - 날씨 이모티콘
 */
function getWeatherIcon(wf) {
    if (wf.includes("맑음")) return "☀️";
    if (wf.includes("구름많")) return "⛅"; // '구름많음', '구름많고' 등 모두 포함
    if (wf.includes("흐림")) return "☁️";
    if (wf.includes("구름") && wf.includes("소나기")) return "🌦︎";
    if (wf.includes("뇌우")) return "⛈️";
    if (wf.includes("비") || wf.includes("소나기")) return "🌧️";
    if (wf.includes("눈")) return "❄️";
    if (wf.includes("우박")) return "🌨️";
    return "❔"; // 그 외의  경우
}

// ==================== [FUNC] 날씨 설정 END  =================


// ==================== [FUNC] 출석체크 함수 STRT ============== ##3
// 전체 출석 데이터를 불러오는 함수
function loadAttendanceData(command) {
    let content = FileStream.read(DB_PATH);
    if (content === null) {
        return {};
    }
    try {
        return JSON.parse(content);
    } catch (e) {
        // JSON 파싱 오류 시 빈 객체 반환 (파일 내용 손상 방지)
        return {};
    }
}
// 전체 출석 데이터를 저장하는 함수
function saveAttendanceData(data) {
    // JSON.stringify의 세 번째 인자는 가독성을 위한 들여쓰기입니다.
    FileStream.write(DB_PATH, JSON.stringify(data, null, 4));
}

/**
 * JSON 문자열에 포함될 수 있는 특수문자를 이스케이프 처리합니다.
 * @param {string} str - 원본 문자열
 * @returns {string} - 이스케이프 처리된 문자열
 */
function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}




// ==================== [FUNC] 출석체크 함수 END  ==============

// ==================== [FUNC] AI 검색 STRT ================== ##2
// AI검색 기능
function searchAI(query, replier) {
    try {
        const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY;
        const url2 = new URL(apiUrl);
        const conn = url2.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");        // Content-Type에 charset=utf-8 추가
        conn.setDoOutput(true);
        const systemInstruction = "당신은 항상 한국어로 답변하는 유용한 어시스턴트입니다. 사용자의 질문이 어떤 언어이든, 답변은 반드시 한국어로 생성해야 합니다.";
        const requestBody = '{' + '"contents": [{ "parts": [{ "text": "' + escapeJsonString(query) + '" }] }],' + '"systemInstruction": {' + '  "parts": [{ "text": "' + escapeJsonString(systemInstruction) + '" }]' + '}' + '}';
        // ========================= 여기가 핵심 수정 부분입니다 =========================
        // DataOutputStream 대신 OutputStreamWriter를 사용하여 UTF-8로 인코딩하여 전송합니다.
        const wr = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
        // writeBytes()가 아닌 write() 메서드를 사용해야 한글이 깨지지 않습니다.
        wr.write(requestBody);
        wr.flush();
        wr.close();
        // =========================================================================
        const responseCode = conn.getResponseCode();
        // 응답 스트림도 UTF-8로 읽도록 지정합니다.
        const responseReader = (responseCode === 200) ? new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8")) : new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));
        let line;
        const response = new java.lang.StringBuffer();
        while ((line = responseReader.readLine()) != null) {
            response.append(line);
        }
        responseReader.close();
        const responseJson = JSON.parse(response.toString());
        if (responseCode === 200) {
            const aiResponse = responseJson.candidates[0].content.parts[0].text;
            replier.reply("🤖 AI 답변:\n\n" + aiResponse);
        } else {
            const errorMessage = responseJson.error ? responseJson.error.message : "알 수 없는 오류";
            replier.reply("AI 요청 중 오류가 발생했습니다.\n\n오류: " + errorMessage);
        }
    } catch (e) {
        replier.reply("AI 검색 중 네트워크 또는 스크립트 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.");
    }
}

// ==================== 잘못된 명령어 처리 함수 ==================
function handleInvalidCommand(db, room, msg, replier) {
    const currentErrorCount = db[room].errorCount;
    // 오류 횟수가 5회 이상 누적된 상태일 때
    if (currentErrorCount >= MAX_ERROR_COUNT) {
        if (msg.startsWith("/")) {
            const query = msg.substring(1).trim();
            if (query) {
                //const aiResult = searchAI(query, replier);
                searchAI(query, replier);
                //replier.reply(aiResult);
                // AI 검색 성공 후 오류 횟수 초기화
                db[room].errorCount = 0;
            } else {
                replier.reply("검색어를 입력해주세요. (예: /오늘 날씨 알려줘)");
            }
        } else {
            replier.reply("오류 횟수가 " + MAX_ERROR_COUNT + "회를 초과했습니다.\nAI 검색을 원하시면 '/검색어' 형식으로 입력해주세요.");
        }
    } else {
        // 오류 횟수 증가
        db[room].errorCount++;
        // 5번째 오류가 발생했을 때
        if (db[room].errorCount === MAX_ERROR_COUNT) {
            // 여기가 에러
            if (msg.startsWith("/")) {
                const query2 = msg.substring(1).trim();
                if (query2) {
                    searchAI(query2, replier);
                    const aiResult2 = searchAI(query2, replier);
                    replier.reply(aiResult2);
                    // AI 검색 성공 후 오류 횟수 초기화
                    db[room].errorCount = 0;
                } else {
                    replier.reply("검색어를 입력해주세요. (예: /오늘 날씨 알려줘)\n오류 횟수가 5회에 도달하여 AI 검색 모드가 활성화되었습니다.");
                    // 검색어가 없었으므로 카운트는 유지하고 다음 메시지를 기다립니다.
                }
            } else {
                replier.reply("잘못된 명령어입니다. (오류 " + db[room].errorCount + "/" + MAX_ERROR_COUNT + ")\n" + "오류 횟수가 " + MAX_ERROR_COUNT + "회에 도달했습니다.\n" + "이제부터 '/검색어' 형식으로 AI에게 질문할 수 있습니다.");
            }
        } else {
            replier.reply("잘못된 명령어입니다.\n'/명령어'를 사용하여 명령어를 확인해 주세요.");
        }
    }
}

// ==================== 카톡방 채팅 정보 조회 함수 ================
/**
 * 채팅을 파일에 기록하는 함수
 * @param {string} room - 채팅방 이름
 * @param {string} sender - 보낸 사람 이름
 */
function logChat(room, sender) {
    try {
        let logs = [];
        // 기존 로그 파일이 있으면 읽어오기
        if (FileStream.read(LOG_FILE_PATH)) {
            logs = JSON.parse(FileStream.read(LOG_FILE_PATH) || "[]");
        }

        // 새 로그 추가 (보낸사람, 방이름, 현재시간 타임스탬프)
        logs.push({
            sender: sender,
            room: room,
            timestamp: new Date().getTime() // getTime()은 숫자 형태라 계산에 용이
        });

        // 변경된 로그를 다시 파일에 쓰기
        FileStream.write(LOG_FILE_PATH, JSON.stringify(logs, null, 2));
    } catch (e) {
        Log.e("로그 저장 중 오류 발생: " + e);
    }
}

/**
 * 특정 사용자의 정보를 조회하고 결과 문자열을 반환하는 함수
 * @param {string} room - 조회할 채팅방 이름
 * @param {string} targetUser - 조회할 사용자 이름
 * @returns {string} - 결과 메시지
 */
function getUserInfo(room, targetUser) {
    //try {
    if (!FileStream.read(LOG_FILE_PATH)) {
        return "아직 분석할 채팅 데이터가 없습니다.";
    }

    const allLogs = JSON.parse(FileStream.read(LOG_FILE_PATH));

    // 현재 채팅방의 모든 로그 필터링
    const roomLogs = allLogs.filter(log => log.room === room);

    if (roomLogs.length === 0) {
        return "이 채팅방에는 아직 분석할 데이터가 없습니다.";
    }

    // 1. 마지막 채팅 시간 찾기
    //    - 3개월 조건 없이 전체 로그에서 찾음
    const userLogsAll = roomLogs.filter(log => log.sender === targetUser);
    if (userLogsAll.length === 0) {
        return "[" + targetUser + "] 님은 이 방에서 채팅 기록이 없습니다.";
    }

    // 마지막 로그를 찾기 위해 시간 순으로 정렬 (최신이 맨 앞)
    userLogsAll.sort((a, b) => b.timestamp - a.timestamp);
    const lastChatTime = new Date(userLogsAll[0].timestamp);
    const lastChatTimeStr = lastChatTime.toLocaleString("ko-KR"); // "YYYY. M. D. 오전/오후 H:MM:SS" 형식

    // 2. 최근 3개월 데이터 계산
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoTimestamp = threeMonthsAgo.getTime();

    // 최근 3개월간의 이 방의 모든 채팅
    const recentRoomLogs = roomLogs.filter(log => log.timestamp >= threeMonthsAgoTimestamp);

    // 최근 3개월간의 대상 사용자의 채팅
    const recentUserLogs = recentRoomLogs.filter(log => log.sender === targetUser);

    const totalChatsIn3Months = recentRoomLogs.length;
    const userChatsIn3Months = recentUserLogs.length;

    // 3. 비율 계산 (0으로 나누는 것 방지)
    const chatRatio = totalChatsIn3Months > 0 ? (userChatsIn3Months / totalChatsIn3Months * 100).toFixed(2) : 0;

    // 4. 최종 결과 메시지 생성
    let result = "📊 [" + targetUser + "] 님 정보\n";
    result += "───────────────\n";
    result += "✉️ 마지막 채팅: " + lastChatTimeStr + "\n\n";
    result += "📈 최근 3개월 활동\n";
    result += " - 채팅 횟수: " + userChatsIn3Months + "회\n";
    result += " - 채팅방 지분: " + chatRatio + "% (" + userChatsIn3Months + "/" + totalChatsIn3Months + ")";

    return result;

    //} catch (e) {
    //    Log.e("정보 분석 중 오류 발생: " + e);
    //    return "정보를 분석하는 중에 오류가 발생했습니다.";
    //}
}
// ==================== [FUNC] AI 검색 END  ================== ##2


// ==================== [FUNC] AI MAIN STRT ================= ##0
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 1. 데이터베이스 파일 읽기
    let db = {};
    try {
        const fileContent = FileStream.read(DB_MSG_PATH);
        if (fileContent) {
            db = JSON.parse(fileContent);
        }
    } catch (e) {
        // 파일이 없거나 JSON 형식이 아닐 경우, 빈 객체로 시작
        Log.d("DB 파일을 읽는 중 오류 발생 또는 파일 없음: " + e);
    }
    if (!db[room]) {
        db[room] = {
            errorCount: 0
        };
    }

    if (sender === '정승환' && room === '서브번호') {
        replier.reply('테스트 중입니다.');
    }
    else {
        // 채팅 이력을 조회하기 위해 모든 채팅 기록하기 (가장 중요!)
        logChat(room, sender);

        if (msg.startsWith('/')) {
            // ## 1. 할용 가능 명령어 조회
            if (msg.startsWith("/명령어")) {
                retMsg = "현재 사용 가능한 명령어는 다음과 같습니다.";
                retMsg += "\n\n✅ /ㅊㅊ or /출첵: 출석체크";
                retMsg += "\n🌦 /날씨 [지역]: 지역 날씨 검색";
                retMsg += "\n🤖 /검색 [내용]: GPT를 활용한 내용 검색";
                retMsg += "\n👥 /정보 [이름]: 채팅방에 있는 사용자의 채팅 정보 조회";
                retMsg += "\n👤 /내정보     : 채팅방에서 나의 채팅 정보 조회";
                retMsg += "\n\n추가적인 기능은 관리자에게 요청하시면 빠른 시일 내에 생성해드리겠습니다.";
                replier.reply(retMsg);
                return;
            }
            // ## 2. 날씨 조회
            else if (msg.startsWith("/날씨 ")) {
                // 2-1. 지역 이름 추출
                let location = msg.substring(4).trim();      // "/날씨 " 다음의 모든 텍스트를 지역으로 간주
                if (location === "") {
                    replier.reply("지역 이름을 입력해주세요.\n(예: /날씨 서울)");
                    return;
                }
                try {
                    result = getWeatherSearch(location);
                    replier.reply(result);
                } catch (e) {
                    // Log.e(e); // 디버깅 시 로그 확인
                    replier.reply("'" + location + "'의 날씨 정보를 가져오는 데 실패했습니다.\n" + "지역 이름을 확인하시거나 잠시 후 다시 시도해주세요.");
                }
            }
            else if (msg.trim() === "/날씨") {
                // "/날씨"만 입력했을 경우 전국 날씨 조회
                try {
                    const weatherInfo = getWeatherSearch("전국");
                    replier.reply(weatherInfo);
                }
                catch (e) {
                    Log.e("날씨 정보 조회 중 오류 발생: " + e);
                    replier.reply("날씨 정보 조회 중 오류 발생: " + e);
                }
            }
            else if (msg.startsWith("/검색 ")) {
                if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
                    replier.reply("AI 기능이 아직 설정되지 않았습니다.\n스크립트 파일에 Gemini API 키를 입력해주세요.");
                    return;
                }
                let query = msg.substring(4).trim();
                if (query === "") {
                    replier.reply("검색할 내용을 입력해주세요.\n(예: /검색 대한민국의 수도는?)");
                    return;
                }
                replier.reply("AI가 생각 중입니다... 🧠\n(최대 30초 정도 소요될 수 있습니다)");

                searchAI(query, replier);
            } else if (msg.trim() === "/검색") {
                replier.reply("[AI 검색 도움말]\n/검색 [질문 내용]\n(예: /검색 아인슈타인에 대해 알려줘)");
            }
            else if (msg.startsWith("/ㅊㅊ") || msg.startsWith("/출첵")) {
                const today = getTodayDateString();
                const yesterday = getYesterdayDateString();
                // 1. 전체 데이터 로드
                let allData = loadAttendanceData();
                // 2. 현재 유저의 데이터 가져오기
                let userData = allData[sender];
                if (userData === undefined) {
                    // 3-1. 첫 출석인 경우
                    userData = {
                        lastCheckIn: today,
                        streak: 1
                    };
                    replier.reply("🎉 첫 출석을 축하합니다!\n" + sender + "님, 앞으로 꾸준히 만나요!");
                } else {
                    // 3-2. 기존 출석 데이터가 있는 경우
                    if (userData.lastCheckIn === today) {
                        replier.reply(sender + "님, 오늘은 이미 출석체크를 하셨어요.\n현재 연속 출석: " + userData.streak + "일");
                        return;
                    } else if (userData.lastCheckIn === yesterday) {
                        userData.streak += 1;
                        userData.lastCheckIn = today;
                        replier.reply("✅ " + sender + "님, 출석체크 완료!\n" + "🔥 연속 " + userData.streak + "일째 출석 중입니다! 대단해요!");
                    } else {
                        userData.streak = 1;
                        userData.lastCheckIn = today;
                        replier.reply("✅ " + sender + "님, 오랜만에 오셨네요!\n" + "😭 아쉽지만 연속 출석이 초기화되었어요.\n" + "오늘부터 다시 1일차 시작!");
                    }
                }
                // 4. 변경된 유저 데이터를 전체 데이터에 반영
                allData[sender] = userData;
                // 5. 전체 데이터를 파일에 저장
                saveAttendanceData(allData);
            }
            else if (msg === "/출첵초기화" && sender === ADMIN_NAME) {
                //출첵초기화
                FileStream.remove(DB_PATH);
                replier.reply("✅ 모든 출석 데이터가 초기화되었습니다.");
                return;
            }
            else if (msg.startsWith("/내정보")) {
                // '/내정보' 명령어 처리
                var userInfo = getUserInfo(room, sender);
                replier.reply(userInfo);
            }
            else if (msg.startsWith("/정보 ")) {
                // '/정보 [이름]' 명령어 처리
                const targetUser = msg.substring(4).trim(); // "/정보 " 다음의 텍스트를 추출
                if (!targetUser) {
                    replier.reply("🤔 사용법: /정보 [조회할 사람 이름]");
                    return;
                }
                var userInfo = getUserInfo(room, targetUser);
                replier.reply(userInfo);
            }

            else if (msg.startsWith("/디비 ")) {
                let DB = msg.substring(4).trim();      // "/날씨 " 다음의 모든 텍스트를 지역으로 간주
                if (DB == '1') {
                    replier.reply(setDataBaseSetUp);
                } else if (DB == '2') {
                    replier.reply(getDataBase);
                }
                
            }
            else {
                handleInvalidCommand(db, room, msg, replier);
            }
        }
    }
    
    try {
        FileStream.write(DB_MSG_PATH, JSON.stringify(db, null, 4));    // null, 4는 JSON을 예쁘게 포맷팅
    } catch (e) {
        Log.e("DB 파일 저장 오류: " + e);
    }
}
// ==================== [FUNC] AI MAIN END  =================