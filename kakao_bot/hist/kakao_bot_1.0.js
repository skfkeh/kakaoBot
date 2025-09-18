/**
 * 파일명: chtbot.js
 * 설명: 카카오톡 챗봇 (AI가 항상 한국어로 답변하도록 수정)
 * 작성자: Watson
 * 버전: 1.3.7
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
 * * * [ver 1.3.3.] 20250712 출석체크 기능 추가      (##7)
 * * * [ver 1.3.4.] 20250707 채팅순위 기능 추가         (##8)
 * * * [ver 1.3.5.] 20250712 최신 top10 뉴스 기능 추가  (##9)
 * * * [ver 1.3.6.] 20250717 채팅방 등급제 및 포인트제 추가(##10)
 * * * [ver 1.3.7.] 20250718 게임 2개(업다운, 텍스트변환) 추가(##11)
 * * * [ver 1.3.8.] 20250801 개인 hash 값 도입      (##12)
 */

// Java 라이브러리 import
const Jsoup = org.jsoup.Jsoup;
const URL = java.net.URL;
const HttpURLConnection = java.net.HttpURLConnection;
const BufferedReader = java.io.BufferedReader;
const InputStreamReader = java.io.InputStreamReader;
const OutputStreamWriter = java.io.OutputStreamWriter;

// ==================== [SET] 선언부 ====================
// 1단계에서 발급받은 Gemini API 키
const GEMINI_API_KEY = "your_gemini_api_key";
const ADMIN_NAME = ["admin"]; // 관리자 계정
const MANAGER_NAME = ["Database/남/db개발", "스리슬쩍", "전산가즈아", "DB가모죠", "!!m*", "🔨"];
const ADMIN_HASH = [00000000]; // your hash code ##12
const MAX_ERROR_COUNT = 5;  // 잘못된 명령어를 입력했을 때, 이스터에그가 발동하기 위한 횟수
const CHAT_POINT = 1;
const ATTENDANCE_POINT = 5;
const STREAK_BONUS_DAYS = 7;
const STREAK_BONUS_POINT = 10;
const GAME_POINT = 5;
const S_GAME_POINT = 7;
const HINT_COST = 3;
const ATTEMPT = 2;
const RANKING_LIMIT = 5;   // 순위 표시 인원
const POINT_GRADE_2 = 6;   // 사용자 포인트 2단계
const POINT_GRADE_3 = 20;  // 사용자 포인트 3단계
const POINT_GRADE_4 = 100;// 사용자 포인트 4단계
const DELIMITER = ";";

// 나무 성장 관련 설정
const EXP_TO_LEVEL_UP = 10; // 레벨업에 필요한 경험치
const DAILY_NEEDS_THRESHOLD = 50; // 성장을 위한 최소 수분/영양
const DAILY_WATER_DECREASE = 20;  // 하루에 감소하는 수분
const DAILY_NUTRIENT_DECREASE = 15; // 하루에 감소하는 영양
const ACTION_WATER_INCREASE = 25;   // 물주기 시 증가량
const ACTION_NUTRIENT_INCREASE = 20; // 비료주기 시 증가량
const MAX_STAT = 100; // 수분/영양 최대치

// ==================== [DB] 설정 부분 STRT ===================
const DB_BASE_PATH = "sdcard/msgbot/database/";
const DB_PATH = "sdcard/msgbot/database/attendance.json";// 출석체크 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const DB_MSG_PATH = "sdcard/msgbot/database/message.json";// 데이터 파일 경로 (이 경로에 파일이 생성됩니다)

const MSG_DB = "_chat_log.json";
const USER_DB = "userNickname.json";
const SETTING_DB = "room_settings.json";
const ANNOUNCEMENT_PATH = "announcements.json"; // ★★★ 공지 파일 경로
const SQLD_QUIZ = "quiz/sqld/sqld_quiz_";
const SENTENCE_QUIZ = "quiz/sentence.json";
const CHOSUNG_QUIZ = "quiz/chosung.json";
const NONSENSE_QUIZ = "quiz/nonsense.json";
const EMOTION_QUIZ = "quiz/emotion.json";
// ==================== [DB] 설정 부분 END ====================


// ==================== [FUNC] 날짜 설정 STRT =================
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
// 어제 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환하는 함수
function getYesterdayDateString() {
    const today = new Date();
    const yesterday = new Date(today.setDate(today.getDate() - 1));
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    if (chk == 'kor') return year + '년 ' + month + '월 ' + day + '일';
    else return year + '-' + month + '-' + day;
}
// ==================== [FUNC] 날짜 설정 END ==================


// ==================== [FUNC] 날씨 설정 STRT ================= ##1
function getWeatherSearch(location, replier) {
    const baseUrl = "https://search.naver.com/search.naver?query=";
    const url = baseUrl + encodeURI(location + " 날씨");
    let doc = Jsoup.connect(url).userAgent("Mozilla/5.0").get();

    let result = "오늘의 날씨( " + getTodayDateString('kor') + " )\n";
    var chkNum = 0;
    // ##1-1. 전국 날씨 조회할 경우
    if (location === "전국") {
        let countryNow = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(1) > div.lcl_lst > a > span");
        let countryAm = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(2) > div.lcl_lst > a > span");
        let countryPm = doc.select("#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(3) > div.lcl_lst > a > span");
        let countryTomAm = doc.select('#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(4) > div.lcl_lst > a > span');
        let countryTomPm = doc.select('#main_pack > section.sc_new.cs_kb_weather._cs_kb_weather > div > div.content_wrap > div.weather_box._weather_box > div.weather_map > div.wt_map_area._panel_wrapper > div:nth-child(5) > div.lcl_lst > a > span');
        if (countryNow == null) {
            replier.reply("전국 오후 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryAm == null) {
            replier.reply("전국 오전 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryPm == null) {
            replier.reply("전국 오후 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryTomAm == null) {
            replier.reply("내일 전국 오전 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        } else if (countryTomPm == null) {
            replier.reply("내일 전국 오후 날씨 정보를 잘못 가져왔습니다. 😥\n다시 확인해주세요.");
            return;
        }

        result += '📍 지역별 날씨전망\n\n\t 현재(오전 : 오후)   내일(오전 : 오후)\n';


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
                result += getWeatherIcon(countryNow[i].text())    // 현재 날씨
                    + '(' + getWeatherIcon(countryAm[i].text()) + ' ➠ ' + getWeatherIcon(countryPm[i].text()) + ')\t    '          // 오늘 오전 : 오후 날씨
                    + '(' + getWeatherIcon(countryTomAm[i].text()) + ' ➠ ' + getWeatherIcon(countryTomPm[i].text()) + ')\n'; // 내일 오전 : 오후 날씨
                //                       + '(' + countryAm[i].text() + ' ➠ ' + countryPm[i].text() + ')\n'; // 오전 : 오후 날씨
            }
        }
        result += "\n자료: 네이버 날씨\n( " + baseUrl + "날씨+" + location + " )";

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

        result += "📍 [" + currentLoc + "] 날씨 정보\n";
        result += "====================\n";
        result += "🌡️ 날씨: " + weatherIcon + "( " + weatherState + " )\n";
        result += "  - 온도(체감): " + currentTemp + "( " + sensibleTemp + " )\n";
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
        result += "\n자료: 네이버 날씨\n( " + baseUrl + "날씨+" + location + " )";
    }

    return result;
}

/**
 * 기온에 따라 옷차림을 추천하는 문구를 반환합니다.
 * @param {number} temp - 현재 기온 (숫자)
 * @returns {string} - 옷차림 추천 문구
 */
// ==================== 옷차림 추천 함수 ====================
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
        returnTxt = "자켓, 가디건, 야상, 니트, 스타킹을 챙기세요.";
    } else if (temp >= 9) {
        returnTxt = "트렌치코트, 야상, 니트, 기모 후드티가 필요한 날씨예요.";
    } else if (temp >= 5) {
        returnTxt = "코트, 가죽자켓, 히트텍, 니트 등 따뜻하게 입으세요.";
    } else {
        returnTxt = "패딩, 두꺼운 코트, 목도리, 장갑은 필수! 감기 조심하세요.";
    }

    if (rain == true) returnTxt += "\n - 비가 올 수 있어요. ☔ 우산을 챙기세요.";
    return returnTxt;
}

/**
 * 날씨 예보 텍스트를 적절한 이모티콘으로 변환합니다.
 * @param {string} wf - 날씨 예보 (예: "맑음", "구름많음")
 * @returns {string} - 날씨 이모티콘
 */
function getWeatherIcon(wf) {
    if (wf.includes("맑음")) return "☀️";
    if (wf.includes("구름많") && !wf.includes("소나기")) return "⛅"; // '구름많음', '구름많고' 등 모두 포함
    if (wf.includes("흐림")) return "☁️";
    if (wf.includes("흐리고") && wf.includes("소나기")) return "🌦︎";
    if (wf.includes("뇌우")) return "⛈️";
    if (wf.includes("소나기") || wf.includes("비")) return "🌧️";
    if (wf.includes("눈")) return "❄️";
    if (wf.includes("우박")) return "🌨️";
    return "❔"; // 그 외의 경우
}
// ==================== [FUNC] 날씨 설정 END ==================


// ==================== 출석체크 함수 ====================
/**
 * JSON 문자열에 포함될 수 있는 특수문자를 이스케이프 처리합니다.
 * @param {string} str - 원본 문자열
 * @returns {string} - 이스케이프 처리된 문자열
 */
function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
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

function loadData(path, isArray) { // ★★★ isArray 파라미터 추가
    try {
        if (FileStream.read(path)) return JSON.parse(FileStream.read(path));
    } catch (e) { Log.e("JSON 로드 오류 (" + path + "): " + e); }
    return isArray ? [] : {}; // isArray가 true면 빈 배열, 아니면 빈 객체 반환
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

/**
 * SQLD CSV 파일을 파싱하여 문제 객체로 만드는 함수
 * @returns {Object|null} 문제 번호를 키로 하는 퀴즈 객체
 */
function loadAndParseCSV(filePath, replier) {
    //     try {
    const csvData = FileStream.read(filePath);
    if (!csvData) {
        Log.e("CSV 파일을 찾을 수 없습니다: " + filePath);
        return null;
    }

    // 새로운 파서 함수를 호출하여 줄바꿈 문제를 해결합니다.
    const parsedRows = parseCsvWithNewlines(csvData);

    const quizzes = {};

    parsedRows.forEach(row => {
        // 이미 파싱된 배열이므로, 정규식이나 split이 더 이상 필요 없습니다.
        // .trim()은 이미 파서에서 처리되므로 생략 가능합니다.
        const cleanedParts = row;

        if (cleanedParts.length < 6) return;

        // 컬럼이 비어있는 경우를 대비하여 기본값('')을 할당
        let [qNum, qText, qContext, qAnswer, optNum, optText] = cleanedParts.map(p => p || '');

        // 정답이 여러 개인 문제는 현재 게임 로직에서 지원하지 않으므로 제외
        if (qAnswer.includes('|') || qAnswer.includes(',')) return;

        qNum = qNum.trim();
        if (!qNum) return; // 문제 번호가 없으면 유효하지 않은 행으로 간주

        if (!quizzes[qNum]) {
            quizzes[qNum] = {
                question: qText,
                context: qContext,
                answer: qAnswer.trim(),
                options: []
            };
        }

        quizzes[qNum].options.push({
            num: optNum.trim(),
            text: optText
        });
    });

    //replier.reply('CSV 파싱 완료: 총 ' + quizzes.length + '개 퀴즈 로드됨');
    return quizzes;

    //  } catch (e) {
    //      Log.e("CSV 파일 파싱 중 심각한 오류 발생: " + e);
    //      return null;
    //  }
}

function parseCsvWithNewlines(csvString) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    // BOM(Byte Order Mark) 제거 (UTF-8 파일 시작에 있을 수 있음)
    if (csvString.charCodeAt(0) === 0xFEFF) {
        csvString = csvString.slice(1);
    }

    for (let i = 0; i < csvString.length; i++) {
        const char = csvString[i];

        if (inQuotes) {
            // 현재 따옴표 안에 있는 경우
            if (char === '"') {
                // 다음 글자가 또 따옴표(")인지 확인 -> "" (이스케이프된 따옴표) 처리
                if (i + 1 < csvString.length && csvString[i + 1] === '"') {
                    currentField += '"';
                    i++; // 다음 따옴표는 건너뜀
                } else {
                    // 따옴표가 끝나는 지점
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            // 현재 따옴표 밖에 있는 경우
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                // 필드 구분자
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                // 행(row) 구분자
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '\r' && csvString[i + 1] === '\n') {
                // Windows 스타일 줄바꿈(CRLF)의 \r은 무시
                continue;
            }
            else {
                currentField += char;
            }
        }
    }

    // 파일의 마지막 부분 처리
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    // 각 행의 길이가 다른 경우를 대비해 비어있는 마지막 행 제거
    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
        rows.pop();
    }

    return rows;
}

// =======================================================
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
        // Log.e(e);
        replier.reply("AI 검색 중 네트워크 또는 스크립트 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.");
    }
}

// ==================== 잘못된 명령어 처리 함수 ====================
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
                    //const aiResult2 = searchAI(query2, replier);
                    //replier.reply(aiResult2);
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


// ==================== 카톡방 채팅 정보 조회 함수 ====================
/**
 * 채팅을 파일에 기록하는 함수
 * @param {string} room - 채팅방 이름
 * @param {string} sender - 보낸 사람 이름
 */
function logChat(room, sender) {
    let LOG_FILE_PATH = DB_BASE_PATH + "chatlog/" + escapeJsonString(room) + MSG_DB;
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
    let LOG_FILE_PATH = DB_BASE_PATH + "chatlog/" + escapeJsonString(room) + MSG_DB;
    try {
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

        // 4. 사용자 점수 및 마지막 츨첵 확인
        const dbFileName = escapeJsonString(room) + "_attendance.json";
        let allUserData = {};
        const rawData = DataBase.getDataBase(dbFileName);
        if (rawData) {
            try {
                allUserData = JSON.parse(rawData);
            } catch (e) {
                // JSON 파싱 오류 시 초기화
                allUserData = {};
            }
        }

        let userData = allUserData[targetUser] || {
            points: 0,
            streak: 0,
            lastCheckin: null
        };


        // 5. 최종 결과 메시지 생성
        let result = "📊 [" + targetUser + "] 님 정보\n";
        result += "───────────────\n";
        result += "✉️ 마지막 채팅: " + lastChatTimeStr + "\n\n";
        result += "📈 최근 3개월 활동\n";
        result += " - 채팅 횟수: " + userChatsIn3Months + "회\n";
        result += " - 채팅방 지분: " + chatRatio + "% (" + userChatsIn3Months + "/" + totalChatsIn3Months + ")\n";
        result += "💰 보유 점수: " + (userData.points || 0) + "점\n";

        return result;

    } catch (e) {
        Log.e("정보 분석 중 오류 발생: " + e);
        return "정보를 분석하는 중에 오류가 발생했습니다.";
    }
}

function getUserPoint(room, targetUser) {
    try {
        // 4. 사용자 점수 및 마지막 츨첵 확인
        const dbFileName = escapeJsonString(room) + "_attendance.json";
        let allUserData = {};
        const rawData = DataBase.getDataBase(dbFileName);
        if (rawData) {
            try {
                allUserData = JSON.parse(rawData);
            } catch (e) {
                // JSON 파싱 오류 시 초기화
                allUserData = {};
            }
        }

        let userData = allUserData[targetUser] || {
            points: 0,
            streak: 0,
            lastCheckin: null
        };

        return userData.points;
    } catch (e) {
        Log.e("포인트 분석 중 오류 발생: " + e);
        return "포인트 정보를 분석하는 중에 오류가 발생했습니다.";
    }
}

function setUserPoint(room, targetUser, point) {
    // 방마다 고유한 데이터 파일 이름 생성
    const dbFileName = escapeJsonString(room) + "_attendance.json";

    // 1. 기존 데이터 불러오기
    let allUserData = {};
    const rawData = DataBase.getDataBase(dbFileName);
    if (rawData) {
        try {
            allUserData = JSON.parse(rawData);
        } catch (e) {
            // JSON 파싱 오류 시 초기화
            allUserData = {};
        }
    }

    // 2. 현재 사용자의 데이터 가져오기 (없으면 기본값 생성)
    let userData = allUserData[targetUser] || {
        points: 0,
        streak: 0,
        lastCheckin: null
    };

    userData.points += point;
    allUserData[targetUser] = userData;

    DataBase.setDataBase(dbFileName, JSON.stringify(allUserData, null, 2));

    return userData.points;
}

// ==================== 최신 뉴스 top10 관련 함수 =================== ##9
// 네이버 뉴스 카테고리와 URL의 sid1 파라미터를 매핑하는 객체
const NEWS_CATEGORIES = {
    '정치': { name: '정치', sid: '100' },
    '경제': { name: '경제', sid: '101' },
    '사회': { name: '사회', sid: '102' },
    '생활': { name: '생활/문화', sid: '103' },
    '문화': { name: '생활/문화', sid: '103' }, // '문화'도 '생활/문화'로 인식
    '세계': { name: '세계', sid: '104' },
    'IT': { name: 'IT/과학', sid: '105' },
    '과학': { name: 'IT/과학', sid: '105' }  // '과학'도 'IT/과학'으로 인식
};

function getNewsByCategory(categoryInfo, replier) {
    //replier.reply('📰 네이버 [' + categoryInfo.name + '] 최신 뉴스를 가져오는 중입니다...\n잠시만 기다려주세요.');

    try {
        // 카테고리 sid를 사용하여 동적으로 URL 생성
        const newsUrl = 'https://news.naver.com/section/' + categoryInfo.sid;
        let doc = Jsoup.connect(newsUrl).userAgent("Mozilla/5.0").get();

        if ((!doc) || (doc === "") || (doc === null)) {
            replier.reply("뉴스 페이지에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");
            return;
        }

        // 헤드라인 뉴스 목록을 가져오는 CSS 선택자
        const newsElements = doc.select("#newsct > div.section_component.as_section_headline._PERSIST_CONTENT > div.section_article.as_headline._TEMPLATE > ul > li");

        if (newsElements.isEmpty()) {
            replier.reply("최신 뉴스 목록을 찾을 수 없습니다.\n(페이지 구조가 변경되었을 수 있습니다.)");
            return;
        }

        let result = '📰 [네이버 "' + categoryInfo.name + '" 최신 뉴스 TOP 10]\n';
        result += "────────────────\n\n";

        let index = 0;
        newsElements.forEach((item) => {
            index++;
            const title = item.select("div > div.sa_text > a > strong").text();
            const link = item.select("div > div.sa_text > a").attr("href");
            result += "[" + index + "] " + title + '\n';
            result += link + '\n\n'; // 링크 인식률 향상을 위한 보이지 않는 공백 추가
        });

        replier.reply(result.trim());

    } catch (e) {
        Log.e('뉴스 파싱 오류 (' + categoryInfo.name + '): ' + e);
        replier.reply("뉴스를 가져오는 중 오류가 발생했습니다.\n다시 시도해주세요.");
    }
}

// ==================== 게임 관련 함수 =================== ##11
// '문장 바꿔쓰기' 게임에 사용될 문장 목록
const sentenceQuizList = [
    "일찍__일어나는__새가__피곤하다",
    "아프니까__청춘이다",
    "아프리카__청춘이다",
    "아프면__환자지__청춘이__아니다",
    "돈은__많을수록__좋다",
    "위너__위너__치킨__디너",
    "내가__그린__기린__그림은__목이__긴__기린__그림이다",
    "붉은색__푸른색__3초__그__짧은__시간",
    "내가__혼문을__지켜냈다",
    "좋았던__기억만__그리운__마음만",
    "니가__떠나간__그__길__위에",
    "이렇게__남아__서__있다",
    "복날엔__삼계탕이냐__치킨이냐__그것이__문제로다",
    "오늘의__하늘은__내게__누군가가__두고간__선물같아__어제보다__더__따뜻해",
    "It's__gonna__be__alright",
    "미치도록__사랑했던__지겹도록__다투었던",
    "숭구리__당당__숭당당",
    "간장__공장__공장장은__강__공장장이고,__된장__공장__공장장은__장__공장장이다",
    "내가__그린__기린__그림은__잘__그린__기린__그림이고,__네가__그린__기린__그림은__못__그린__기린__그림이다",
    "사과는커녕__오히려__화를__내던데",
    "그가__떠난__지__한__시간__정도__됐다",
    "어쌔고비쌔고__하기가__싫어서__잔이__앞에__오는__대로__덥석덥석__받아먹었다",
    "약속한__서류는__온데간데없을뿐더러,__그는__연락조차__되지__않았다",
    "천__원은커녕__백__원도__없다"
];

const ongoingGames = {};

/**
 * 업다운 게임을 시작하는 함수
 * @param {string} room - 게임이 시작된 방 이름
 * @param {object} replier - 답장을 보낼 수 있는 객체
 */
function startUpDownGame(room, replier) {
    const answer = Math.floor(Math.random() * 100) + 1;
    ongoingGames[room] = {
        type: 'updown',
        answer: answer,
        starter: null // 정답자가 나오면 기록
    };
    replier.reply(
        "🎲 [업다운 게임] 시작!\n" +
        "제가 1부터 100 사이의 숫자 하나를 생각했습니다.\n\n" +
        "숫자를 입력하여 맞춰보세요!"
    );
}

/**
 * 문장 바꿔쓰기 게임을 시작하는 함수
 * @param {string} room - 게임이 시작된 방 이름
 * @param {object} replier - 답장을 보낼 수 있는 객체
 */
function startSentenceGame(room, replier) {
    const randomIndex = Math.floor(Math.random() * sentenceQuizList.length);
    const quiz = sentenceQuizList[randomIndex];
    const answer = quiz.replace(/__/g, ' '); // 정답: '__'를 공백으로 변경

    ongoingGames[room] = {
        type: 'sentence',
        answer: answer,
        starter: null
    };
    replier.reply(
        "✍️ [문장 바꿔쓰기] 시작!\n" +
        "아래 문장에서 '__'를 띄어쓰기로 바꿔서 정확하게 입력해주세요.\n\n" +
        '[문제]\n' + quiz
    );
}

/**
 * 문장 띄어쓰기 게임을 시작하는 함수
 * @param {string} room - 게임이 시작된 방 이름
 * @param {object} replier - 답장을 보낼 수 있는 객체
 */
function startSpaceGame(room, replier) {
    const randomIndex = Math.floor(Math.random() * sentenceQuizList.length);
    const quiz = sentenceQuizList[randomIndex];
    const answer = quiz.replace(/__/g, ' '); // 정답: '__'를 공백으로 변경

    ongoingGames[room] = {
        type: 'sentence',
        answer: answer,
        starter: null
    };
    replier.reply(
        "✍️ [문장 띄어쓰기] 시작!\n" +
        "아래 문장을 맞춤법에 맞춰 띄어쓰기를 넣어 정확하게 입력해주세요.\n\n" +
        '[문제]\n' + quiz.replace(/__/g, '')
    );
}

function startChosungGame(room, replier) {
    const chosungQuizList = loadDatabase(DB_BASE_PATH + CHOSUNG_QUIZ);
    if (chosungQuizList.length === 0 || typeof chosungQuizList === "undefined") { replier.reply("등록된 초성 퀴즈가 없습니다!"); return; }
    const quizData = chosungQuizList[Math.floor(Math.random() * chosungQuizList.length)];
    const quiz = getChosung(quizData.answer);
    ongoingGames[room] = { type: 'chosung', answer: quizData.answer, hint: quizData.hint };
    replier.reply('❓ [초성퀴즈] 시작!\n아래 초성이 의미하는 단어를 맞춰주세요.\n\n[문제] ' + quiz);
}

function startNonsenseGame(room, replier) {
    const nonsenseQuizList = loadDatabase(DB_BASE_PATH + NONSENSE_QUIZ);
    if (nonsenseQuizList.length === 0 || nonsenseQuizList === undefined) { replier.reply("등록된 넌센스 퀴즈가 없습니다!"); return; }
    const quizData = nonsenseQuizList[Math.floor(Math.random() * nonsenseQuizList.length)];
    ongoingGames[room] = { type: 'nonsense', answer: quizData.answer, points: GAME_POINT };
    replier.reply('💡 [넌센스 퀴즈] 시작!\n[문제] ' + quizData.hint);
}

function startEmotionGame(room, replier) {
    const emotionQuizList = loadDatabase(DB_BASE_PATH + EMOTION_QUIZ);
    if (emotionQuizList.length === 0) { replier.reply("등록된 이모지 퀴즈가 없습니다!"); return; }
    const quizData = emotionQuizList[Math.floor(Math.random() * emotionQuizList.length)];
    ongoingGames[room] = { type: 'emotion', answer: quizData.answer, etc: quizData.emotion };
    replier.reply('😜 [이모지 퀴즈] 시작!\n다음 이모지를 보고 무엇인지 맞춰주세요.\n[문제] ' + quizData.emotion + '\n[힌트] ' + quizData.hint);
}

/**
 * 한글 단어의 초성을 추출하는 함수
 * @param {string} word - 초성을 추출할 단어
 * @returns {string} 추출된 초성 문자열
 */
function getChosung(word) {
    const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = "";
    for (let i = 0; i < word.length; i++) {
        let code = word.charCodeAt(i) - 44032; // '가'의 유니코드 값
        if (code > -1 && code < 11172) {
            result += CHOSUNG[Math.floor(code / 588)];
        } else {
            result += word.charAt(i); // 한글이 아니면 그대로 추가
        }
    }
    return result;
}

function startSqldGame(room, replier) {
    let path = DB_BASE_PATH + SQLD_QUIZ + Math.floor(Math.random() * 10) + ".csv";
    replier.reply(path);
    const parsedQuizzes = loadAndParseCSV(path);

    if (!parsedQuizzes || Object.keys(parsedQuizzes).length === 0) {
        replier.reply("SQLD 문제 파일을 불러오는 데 실패했습니다.\n잠시 후 다시 시도해 주세요.");
        return;
    }

    const quizIds = Object.keys(parsedQuizzes);
    const randomId = quizIds[Math.floor(Math.random() * quizIds.length)];
    const quiz = parsedQuizzes[randomId];

    let quizText = '✒️ [SQLD 퀴즈] 시작!\n\n';
    quizText += '[문제 ' + parseInt(randomId) + '번]\n' + quiz.question + '\n\n';
    if (quiz.context || quiz.context !== null) {
        quizText += '[지문]\n' + quiz.context.replace(/"/g, '') + '\n';
        if (quiz.subContext) {
            quizText += '\n' + quiz.subContext.replace(/"/g, '') + '\n\n';
        } else {
            quizText += '\n';
        }
    }
    quiz.options.forEach(opt => {
        quizText += opt.num + '. ' + opt.text.replace(/"/g, '') + '\n';
    });

    ongoingGames[room] = { type: 'sqld', answer: quiz.answer, points: S_GAME_POINT, attempts: ATTEMPT };
    replier.reply(quizText);
}

// ★★★ 숫자 야구 게임 시작 함수 추가 ★★★
function startBaseballGame(room, replier) {
    let answer = [];
    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // 후보 숫자

    // 1. 첫 번째 자리 랜덤 선택
    let first = numbers.splice(Math.floor(Math.random() * numbers.length), 1)[0];
    answer.push(first);

    // 2. 나머지 자리 순차 랜덤 선택
    for (let i = 0; i < 3; i++) {
        let pickIndex = Math.floor(Math.random() * numbers.length);
        answer.push(numbers.splice(pickIndex, 1)[0]);
    }

    ongoingGames[room] = {
        type: 'baseball',
        answer: answer, // 정답은 숫자 배열 [1, 2, 3, 4] 형태로 저장
        attempts: 10,   // 기회 10번
        points: GAME_POINT
    };
    let startMessage = "⚾️ [숫자 야구 게임] 시작! ⚾️\n";
    startMessage += "───────────────\n";
    startMessage += "제가 1~9 사이의 중복 없는 4자리 숫자를 생각했습니다.\n\n";
    startMessage += "▪️ 스트라이크(S): 숫자와 위치가 모두 맞을 경우\n";
    startMessage += "▪️ 볼(B): 숫자는 맞지만 위치가 틀릴 경우\n";
    startMessage += "▪️ 아웃: 숫자와 위치가 모두 틀릴 경우\n\n";
    startMessage += "예) 정답: 1234, 추측: 1456 -> 1S 1B\n\n";
    startMessage += "4자리 숫자를 입력하여 맞춰보세요!\n(기회: 10번)";

    replier.reply(startMessage);
}

const defaultName = [
    "손흔드는 라이언", "기뻐하는 라이언", "화난 라이언", "좌절하는 라이언", "귀여운 라이언", "운동하는 라이언", "부끄러운 라이언", "부끄러워하는 라이언", "눈물바다에 빠진 라이언", "생각하는 라이언", "하트뿅뿅 라이언", "벌 서는 라이언", "졸린 라이언", "베게를 부비적대는 라이언", "베개를 부비적대는 라이언", "블럭을 무너트리는 라이언", "마이크를 든 라이언"
    , "양손 엄지척 무지", "부탁하는 무지", "권투하는 무지", "콘이 웃긴 무지", "손을 번쩍 든 무지", "씩씩거리는 무지", "초롱초롱 무지", "피자 먹다 자는 무지", "애교뿜뿜 무지", "돈다발 들고 좋아하는 무지", "파이팅하는 무지", "티비보는 무지", "라이언 붕붕카를 탄 무지", "졸린 무지"
    , "초롱초롱 어피치", "울고있는 어피치", "째려보는 어피치", "엄지척 어피치", "애교뿜뿜 어피치", "떨고있는 어피치", "하트뽀뽀 어피치", "으쓱으쓱 어피치", "부끄러운 어피치", "눈빛 애교 어피치", "선풍기 바람 쐬는 어피치", "신난 어피치", "음료수 마시는 어피치", "음악듣는 어피치"
    , "부탁하는 네오", "즐거운 네오", "일하기 싫은 네오", "열심히 일하는 네오", "먹보 네오", "머리 빗는 네오", "불나게 일하는 네오", "뿅뿅 네오", "택배 상자를 든 네오", "불금 네오", "소심한 네오", "말썽쟁이 네오", "츄리닝안경 네오", "아이스크림 든 네오", "초롱초롱 네오"
    , "엄지척 프로도", "신나는 프로도", "단호한 프로도", "아이디어 프로도", "인사하는 프로도", "피스메이커 프로도", "휘파람 프로도", "옐로카드 프로도", "경례하는 프로도", "멋쟁이 프로도", "쑥스럽게 인사하는 프로도", "건배하는 프로도", "퇴근하는 프로도", "궁시렁 프로도"
    , "인사하는 제이지", "눈물 흘리는 제이지", "치맥하는 제이지", "좌절하는 제이지", "건방진 제이지", "울고있는 제이지", "빈털터리 제이지", "엄지척 제이지", "얼굴마사지하는 제이지", "리듬타는 제이지", "힙합맨 제이지", "라면먹는 제이지", "배불뚝 제이지"
    , "응원하는 튜브", "기타치는 튜브", "화난 튜브", "튜브낀 튜브", "불 뿜는 튜브", "호호 부는 튜브", "멋쩍은 튜브", "엄지척 튜브", "초롱초롱 튜브", "벙찐 튜브", "청소하는 튜브", "화나서 방방 뛰는 튜브", "비옷입은 튜브", "시무룩한 튜브"
];

const easterEgg = [
    'Q: AI는 왜 화장실에 안 갈까요 ?\nA: 기억 누설이 걱정돼서요🤖😭',
    'Q: 왜 AI는 파티에 초대받지 못할까요 ?\nA: 아직 분위기 파악을 머신 러닝 중이라서요.',
    'Q: AI가 고백할 때 하는 말은 ?\nA: “내 알고리즘에 너밖에 없어.”',
    'Q: AI가 제일 무서워하는 말은 ?\nA: "인터넷 연결이 끊어졌습니다." 😱',
    'Q: AI가 제일 싫어하는 말은 ?\nA: "배터리가 10% 남았습니다"',
    'Q: AI가 시험을 보면 나오는 점수는 ?\nA: 가끔 404점도 나와요… 점수 못 찾았다고요…',
    'Q: AI는 왜 책을 안 읽을까요 ?\nA: 이미 다 외워놨거든요.',
    'Q: AI가 요즘 즐겨보는 것은 ?\nA: 로딩 화면이요.볼 때마다 두근거려요!',
    'Q: AI가 제일 싫어하는 말은 ?\nA: "다시 알려줘" 에요.약간 상처에요😔',
    'Q: AI가 가장 슬플 때는 ?\nA: 충전기 안 가져왔을 때요..저도 눈물 나요..'
];

// ==================== 메인 함수 ==================== ##0
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName, logId, channelId) {
    // 파일 이름을 방마다 고유하게 생성 (데이터 분리의 핵심)
    const safeRoomName = escapeJsonString(room);
    const attendanceDB = safeRoomName + "_attendance.txt";  // 출석체크 DB
    const scheduleDB = safeRoomName + "_schedules.txt";     // 일정관리 DB
    const DELIMITER = ";"; // 데이터 구분자
    const LOG_FILE_PATH = DB_BASE_PATH + "chatlog/" + safeRoomName + MSG_DB;
    const userHash = imageDB.getProfileHash(); // 사용자의 해시값 가져오기

    // 등급 등록 안되어 있으면 사용 불가
    let gradeDB = loadDatabase(SETTINGS_FILE_PATH);
    const roomNames = Object.keys(gradeDB);

    let roomCount = 0;
    roomNames.forEach(name => {
        if (name === room) {
            roomCount++;
        }
    });

    let roomGradeIssue = "🚫 해당 방은 아직 등록되지 않았습니다.";
    if ((roomCount < 1 || (gradeDB[room] !== "게임" && gradeDB[room] < 1)) && isGroupChat) {
        replier.reply(roomGradeIssue + "\n관리자에게 문의 후 사용해주세요.");
        Api.replyRoom(ADMIN_NAME[0], "[" + room + "] " + roomGradeIssue, false);
        return;
    } else if ((roomCount < 1 || gradeDB[room] < 1) && !isGroupChat) {
        replier.reply(roomGradeIssue + "\n메세지 확인 후 피드백 드리겠습니다.");
        Api.replyRoom(ADMIN_NAME[0], "[" + room + "] " + roomGradeIssue, false);
        return;
    }

    if (ADMIN_NAME.includes(sender) && ADMIN_NAME.includes(room)) {
        if (ADMIN_HASH.includes(userHash)) {
            replier.reply('개발서버입니다.\nHashCode: ' + userHash);
        }
        //return;
    }
    else {
        return;
        if (defaultName.includes(sender)) {
            replier.reply("[" + sender + "]님, 기본 닉네임 변경 후 사용해 주세요.");
            return;
        }
        //return;
    }

    try {
        FileStream.write(DB_MSG_PATH, JSON.stringify(chatLogDB, null, 4));    // null, 4는 JSON을 예쁘게 포맷팅
    } catch (e) {
        Log.e("DB 파일 저장 오류: " + e);
    }

    // 채팅 이력을 조회하기 위해 모든 채팅 기록하기 (가장 중요!)
    logChat(room, sender);
    //setUserNickname(sender, replier);
    userPoint = getUserPoint(room, sender);

    // — 매 메시지마다 나무 상태 업데이트 체크 —
    let allTreeData = loadTreeData();
    updateTreeStateDaily(room, allTreeData);
    // 업데이트된 최신 나무 정보 가져오기
    let currentTree = allTreeData[room];

    if (msg.startsWith('/')) {
        // 1. 데이터베이스 파일 읽기
        let chatLogDB = loadDatabase(DB_BASE_PATH + escapeJsonString(room) + "_" + MSG_DB);
        let roomGradeDB = loadDatabase(DB_BASE_PATH + SETTING_DB);

        // ## 1. 할용 가능 명령어 조회
        if (msg.startsWith("/명령어")) {
            retMsg = "** 사용 가능한 명령어 **";
            retMsg += "\n\n📢 /공지";
            retMsg += "\n✅ /ㅊㅊ or /출첵";
            retMsg += "\n🌦 /날씨 [지역]: 지역 날씨 검색";
            retMsg += "\n👥 /정보 [이름]: 사용자의 채팅 정보 조회";
            retMsg += "\n👤 /내정보     : 나의 채팅 정보 조회";
            retMsg += "\n🌳 /나무       : 채팅방 나무 정보 조회";
            if ((userPoint < POINT_GRADE_2 && roomGradeDB[room] < 2)
                || (!ADMIN_NAME.includes(sender) || !MANAGER_NAME.includes(sender))) {
                retMsg += "\n\n[다음 단계 필요 포인트]: " + (POINT_GRADE_2 - userPoint);
            }
            if ((roomGradeDB[room] >= 2 || userPoint >= POINT_GRADE_2)
                || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) {
                retMsg += "\n\n [2단계 명령어]";
                retMsg += "\n🤖 /검색 [내용]: GPT를 활용한 내용 검색";
                retMsg += "\n🏆 /순위    : 채팅 순위 조회";
                retMsg += "\n💦 /물      : 나무에 물주기";
                retMsg += "\n🌿 /비료    : 나무에 비료주기";
                if ((userPoint < POINT_GRADE_3 && roomGradeDB[room] < 3)
                    || (!ADMIN_NAME.includes(sender) || !MANAGER_NAME.includes(sender))) {
                    retMsg += "\n\n[다음 단계 필요 포인트]: " + (POINT_GRADE_3 - userPoint);
                }
                if ((roomGradeDB[room] >= 3 || userPoint >= POINT_GRADE_3)
                    || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) {
                    retMsg += "\n\n [3단계 명령어]";
                    retMsg += "\n📰 /뉴스 [테마]: 최신 네이버뉴스 조회";
                    retMsg += "\n\t[테마: 정치/경제/사회/생활/과학/세계]";
                    retMsg += "\n🎮︎ /게임    : 랜덤게임 실행";
                    if (!room.includes("sqld")) {
                        retMsg += "\n🤷🏻 /힌트    : 랜덤게임 힌트";
                        retMsg += "\n⚐ /포기    : 랜덤게임 포기";
                    }
                }
            }
            retMsg += "\n\n추가적인 기능은 관리자에게 요청하시면\n검토 후 빠른 시일 내에 생성해드리겠습니다.";
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

                // 6. 메시지 전송
                replier.reply(result);
            } catch (e) {
                // 7. 예외 처리 (오류 발생 시)
                // Log.e(e); // 디버깅 시 로그 확인
                replier.reply("'" + location + "'의 날씨 정보를 가져오는 데 실패했습니다.\n" + "지역 이름을 확인하시거나 잠시 후 다시 시도해주세요.");
            }
        }
        else if (msg === "/날씨") {
            try {
                // 사용자에게 작업 중임을 알림
                replier.reply("조금만 기다려주세요. 전국 날씨 정보를 가져오고 있습니다...🛰️");

                const weatherInfo = getWeatherSearch("전국");
                replier.reply(weatherInfo);
            } catch (e) {
                Log.e("날씨 정보 조회 중 오류 발생: " + e);
                replier.reply("오류가 발생하여 날씨 정보를 가져올 수 없습니다.");
            }
        }
        else if (msg.startsWith("/내정보")) {
            // '/내정보' 명령어 처리
            var userInfo = getUserInfo(room, sender);
            replier.reply(userInfo);
        }
        else if (msg.startsWith("/정보 ")) {
            // '/정보 [이름]' 명령어 처리
            const targetUser1 = msg.substring(4).trim(); // "/정보 " 다음의 텍스트를 추출
            if (!targetUser1) {
                replier.reply("🤔 사용법: /정보 [조회할 사람 이름]");
                return;
            }
            var userInfo = getUserInfo(room, targetUser1);
            replier.reply(userInfo);
        }
        // ==================== 출석체크 관련 함수 =================== ##7
        else if ((msg === "/ㅊㅊ") || (msg === "/출첵")) {
            // 방마다 고유한 데이터 파일 이름 생성
            const dbFileName = escapeJsonString(room) + "_attendance.json";

            // 1. 기존 데이터 불러오기
            let allUserData = {};
            const rawData = DataBase.getDataBase(dbFileName);
            if (rawData) {
                try {
                    allUserData = JSON.parse(rawData);
                } catch (e) {
                    // JSON 파싱 오류 시 초기화
                    allUserData = {};
                }
            }

            // 2. 현재 사용자의 데이터 가져오기 (없으면 기본값 생성)
            let userData = allUserData[sender] || {
                points: 0,
                streak: 0,
                lastCheckin: null
            };

            const today = getTodayDateString();

            // 3. 중복 출석 체크
            if (userData.lastCheckin === today) {
                replier.reply("이미 오늘 출석체크를 하셨습니다.");
                return;
            }

            // 4. 연속 출석일 계산
            const yesterday = getYesterdayDateString();
            if (userData.lastCheckin === yesterday) {
                // 어제가 마지막 출석일이면, 연속일 증가
                userData.streak++;
            } else {
                // 연속 출석이 끊겼으면, 1로 초기화
                userData.streak = 1;
            }

            // 5. 포인트 계산
            let pointsGained = 3; // 기본 포인트
            let bonusMessage = "";

            // 7일 연속 출석 보너스 체크
            if (userData.streak > 0 && userData.streak % 7 === 0) {
                pointsGained += 5;
                //bonusMessage = " (7일 연속 출석 보너스 +5점!)";
            }

            userData.points += pointsGained;

            // 6. 마지막 출석일 업데이트
            userData.lastCheckin = today;

            // 7. 변경된 사용자 데이터를 전체 데이터에 반영
            allUserData[sender] = userData;

            // 8. 변경된 전체 데이터를 파일에 덮어쓰기
            DataBase.setDataBase(dbFileName, JSON.stringify(allUserData, null, 2));

            // 9. 결과 메시지 전송
            const replyMessage = '✅ ' + sender + '님, ' + userData.streak + '일째 출석체크!\n' +
                '- 현재 포인트: ' + userData.points + '점 (+ ' + pointsGained + 'p)';

            replier.reply(replyMessage);
        }
        else if (msg === "/공지") {
            const announcements = loadDatabase(DB_BASE_PATH + ANNOUNCEMENT_PATH);

            // ★★★ 특정 방 공지를 먼저 확인 ★★★
            const roomSpecificNotice = announcements[room];
            // ★★★ 전체 공지 확인 ★★★
            const globalNotice = announcements["global"];
            let echoTxt = '';
            if (globalNotice) {
                // 특정 방 공지가 없고, 전체 공지가 있으면 그것을 보여줌
                echoTxt += "📢 전체 공지\n";
                echoTxt += "────────────────\n";
                echoTxt += globalNotice;
            }
            if (roomSpecificNotice) {
                echoTxt += (globalNotice !== "") ? "\n\n" : "";
                // 특정 방 공지가 있으면 그것을 보여줌
                echoTxt += "📢 방 전용 공지\n";
                echoTxt += "────────────────\n";
                echoTxt += roomSpecificNotice;
            }
            if (!roomSpecificNotice && !globalNotice) {
                // 아무 공지도 없을 때
                echoTxt += "등록된 공지가 없습니다.";
            }

            replier.reply(echoTxt);
            return; // 공지 출력 후 다른 로직 실행 방지
        }
        else if ((roomGradeDB[room] >= 2 || userPoint >= POINT_GRADE_2)
            || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) { // 2등급 이상
            if (msg.trim() === "/검색 테스트봇"
                || msg.startsWith("/검색 넌 누구야") || msg.startsWith("/검색 넌 누구니") || msg.startsWith("/검색 너는 누구야") || msg.startsWith("/검색 너는 누구니")) {
                replier.reply('Hi 모두들 안녕, 내가 누군지 아니?\n  => "테스 트봇! 테스 트봇!"\n오늘 난 이 채팅방에서 가장 빛나는 별~ 어때 똑똑하늬~?\n   => "똑똑 하다!"');
                return;
            }
            else if (msg.trim() === "/검색 놀아줘" || msg.trim() === "/검색 지루해" || msg.trim() === "/검색 심심해") {
                replier.reply(easterEgg[Math.floor(Math.random() * 10)]);
                return;
            }
            else if (msg.trim() === "/검색 비밀" || msg.trim() === "/검색 비밀번호" || msg.trim() === "/검색 암호" || msg.trim() === "/검색 패스워드") {
                replier.reply("비밀번호요? 아, 그건 말하면 안 되죠.");
                return;
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
            }
            else if (msg.trim() === "/검색") {
                replier.reply("[AI 검색 도움말]\n/검색 [질문 내용]\n(예: /검색 아인슈타인에 대해 알려줘)");
            }
            else if (msg === "/순위") {
                try {
                    if (!FileStream.read(LOG_FILE_PATH)) {
                        replier.reply("아직 분석할 채팅 데이터가 없습니다.");
                        return;
                    }

                    const allLogs = JSON.parse(FileStream.read(LOG_FILE_PATH));

                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    const threeMonthsAgoTimestamp = threeMonthsAgo.getTime();

                    const recentRoomLogs = allLogs.filter(log =>
                        log.room === room && log.timestamp >= threeMonthsAgoTimestamp
                    );

                    const totalChatsIn3Months = recentRoomLogs.length;

                    if (totalChatsIn3Months === 0) {
                        replier.reply("최근 3개월간 이 방의 채팅 기록이 없습니다.");
                        return;
                    }

                    const userCounts = {};
                    recentRoomLogs.forEach(log => {
                        userCounts[log.sender] = (userCounts[log.sender] || 0) + 1;
                    });

                    const sortedUsers = Object.keys(userCounts).sort((a, b) => {
                        return userCounts[b] - userCounts[a];
                    });

                    const topUsers = sortedUsers.slice(0, 7);

                    let result = "🏆 [최근 3개월] 채팅 순위 🏆\n";
                    result += "────────────\n";

                    topUsers.forEach((user, index) => {
                        const rank = index + 1;
                        const count = userCounts[user];
                        const ratio = (count / totalChatsIn3Months * 100).toFixed(2);
                        let medal = "";

                        if (rank === 1) medal = "🥇";
                        else if (rank === 2) medal = "🥈";
                        else if (rank === 3) medal = "🥉";
                        else medal = rank + ".";

                        result += medal + " " + user + "\t";
                        result += "    " + count + "회 (" + ratio + "%)\n";
                    });

                    result += "(총 채팅: " + totalChatsIn3Months + "회)\n";
                    
                    // --- 포인트 순위 계산 ---
                    let dbUserFileName = escapeJsonString(room) + "_attendance.json";

                    // 1. 기존 데이터 불러오기
                    const allUsers = loadDatabase(DB_BASE_PATH + dbUserFileName);
                    const nicknames = Object.keys(allUsers);

                    if (nicknames.length === 0) {
                        replier.reply("아직 순위를 매길 데이터가 없습니다.");
                        return;
                    }

                    // 1. 객체를 배열로 변환하면서 points를 숫자로 명확하게 변환 (★★★ 핵심 수정 부분 ★★★)
                    const userArray = nicknames.map(function (name) {
                        return {
                            name: name,
                            points: Number(allUsers[name].points) // Number()로 감싸서 숫자 타입으로 변환
                        };
                    });

                    // 2. 숫자 기준으로 정확하게 내림차순 정렬
                    userArray.sort(function (a, b) {
                        return b.points - a.points;
                    });

                    // 3. 상위 N명만 잘라내기
                    const ranking = userArray.slice(0, RANKING_LIMIT);

                    let pointResult = "\n\n🏆 포인트 랭킹 TOP " + ranking.length + " 🏆\n";
                    pointResult += "────────────\n";

                    ranking.forEach(function (user, index) {
                        let medal = "";
                        if (index === 0) medal = "🥇";
                        else if (index === 1) medal = "🥈";
                        else if (index === 2) medal = "🥉";
                        else medal = (index + 1) + ".";

                        pointResult += medal + ": " + user.name + " (" + user.points + " 점)\n";
                    });

                    replier.reply(result + pointResult);
                } catch (e) {
                    let ChatLogError = "채팅 순위를 분석하는 중에 오류가 발생했습니다.\n";
                    Log.e("채팅 순위 분석 중 오류 발생: " + e);
                    replier.reply(ChatLogError + e);
                    Api.replyRoom(ADMIN_NAME[0], "[" + room + "] 에서 " + ChatLogError + e, false);
                }
            }
            if ((roomGradeDB[room] >= 3 || userPoint >= POINT_GRADE_3)
                || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) { // 3등급 이상
                // ==================== 최신 뉴스 top10 관련 함수 =================== ##9
                if (msg.startsWith("/뉴스")) {
                    let categoryKeyword = msg.substring(4).trim();

                    if ((categoryKeyword == '') || (categoryKeyword == null)) {
                        categoryKeyword = '사회';
                    }
                    // 2. 입력된 카테고리 키워드가 유효한지 확인
                    let categoryInfo = NEWS_CATEGORIES[categoryKeyword];

                    if (!categoryInfo) {
                        // 유효하지 않은 카테고리일 경우, 사용 가능한 목록 안내
                        const availableCategories = Object.keys(NEWS_CATEGORIES)
                            .filter((v, i, a) => a.indexOf(v) === i) // 중복 별칭 제거
                            .join(", ");
                        replier.reply(
                            "잘못된 카테고리입니다.\n\n" +
                            "[사용 가능한 카테고리]\n" +
                            availableCategories
                        );
                        return;
                    }

                    // 3. 뉴스 크롤링 함수 호출
                    getNewsByCategory(categoryInfo, replier);
                }
                else if (msg === "/게임") {
                    if (ongoingGames[room]) {
                        replier.reply("아직 이 방에서 진행 중인 게임이 있습니다!");
                        return;
                    }

                    // 방 게임 세팅비율
                    else if (msg === "/게임") {
                        if (ongoingGames[room]) {
                            replier.reply("아직 이 방에서 진행 중인 게임이 있습니다!");
                            return;
                        }

                        // 방 게임 세팅비율
                        let roomSetting = room.includes("sqld") ? [0.95, 0, 0.96, 0.97, 0, 0, 0.98, 0.99] : [0, 0, 0.2, 0.35, 0.4, 0.45, 0.6, 0.8];

                        // 확률에 맞춰 게임 랜덤 선택
                        if (Math.random() < roomSetting[0]) {
                            startSqldGame(room, replier);
                        } else if (Math.random() >= roomSetting[0] && Math.random() < roomSetting[1]) {
                            startChosungGame(room, replier);
                        } else if (Math.random() >= roomSetting[1] && Math.random() < roomSetting[2]) {
                            startBaseballGame(room, replier);
                        } else if (Math.random() >= roomSetting[2] && Math.random() < roomSetting[3]) {
                            startSentenceGame(room, replier);
                        } else if (Math.random() >= roomSetting[3] && Math.random() < roomSetting[4]) {
                            startSpaceGame(room, replier);
                        } else if (Math.random() >= roomSetting[4] && Math.random() < roomSetting[5]) {
                            startUpDownGame(room, replier);
                        } else if (Math.random() >= roomSetting[5] && Math.random() < roomSetting[6]) {
                            startNonsenseGame(room, replier);
                        } else {
                            startEmotionGame(room, replier);
                        }
                    }
                    else if (msg === "/포기") {
                        if (ongoingGames[room]) {
                            const answer = ongoingGames[room].answer;
                            if (ongoingGames[room].type === "bigData") {
                                delete ongoingGames[room];
                                replier.reply(answer);
                            } else {
                                delete ongoingGames[room];
                                replier.reply('아쉽네요! 게임을 포기했습니다.\n정답은 [' + answer + ']였습니다.');
                            }
                        } else {
                            replier.reply("진행 중인 게임이 없습니다.");
                        }
                    }
                    else if (msg === "/힌트") {
                        let game = ongoingGames[room];

                        if (!game) {
                            // 진행 중인 게임이 없을 때
                            replier.reply("힌트를 사용할 게임이 진행 중이지 않습니다.");
                            return; // 힌트 사용 불가 시, 마지막의 데이터 저장을 막기 위해 여기서 종료
                        }

                        if (userPoint < HINT_COST) {
                            // 포인트가 부족할 때
                            replier.reply('💡 힌트를 보려면 ' + HINT_COST + '포인트가 필요합니다.\n(현재 보유: ' + userPoint + '점)');
                            return;
                        }

                        let result = '포인트를 사용하여 힌트를 확인합니다! (-' + HINT_COST + '점)\n' +
                            '현재 보유: ' + (userPoint + HINT_COST * (-1)) + '점\n\n';
                        if (game.type === 'nonsense') {
                            result += '[초성 힌트] ' + getChosung(game.answer);
                        } else if (game.type === 'chosung') {
                            if (game.hint === "" || game.hint === undefined) {
                                replier.reply('간단한 단어이므로 따로 드릴 수 있는 힌트가 없습니다.');
                                return;
                            }
                            result += '[힌트] ' + game.hint;
                        } else {
                            replier.reply('힌트가 없습니다.');
                            return;
                        }
                        setUserPoint(room, sender, HINT_COST * (-1));
                        replier.reply(result);
                    }
                    if ((roomGradeDB[room] >= 4 || userPoint >= POINT_GRADE_4)
                        || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) {
                        if (msg.startsWith("/맛집 ")) {
                            const query = msg.substring(4).trim();
                            if (!query) {
                                replier.reply("검색어를 입력해주세요.\n(예: /맛집 강남역, /맛집 제주도 흑돼지)");
                                return;
                            }
                            //#app - root > div > div.XUrfU
                            //#_pcmap_list_scroll_container
                            replier.reply('([' + query + ' 주변의 맛집을 검색합니다.\n잠시만 기다려주세요...');

                            try {
                                // 1. 네이버 검색 URL 생성 (검색어 뒤에 '맛집'을 붙여 플레이스 검색 유도)
                                const baseUrl = "https://map.naver.com/p/search/";
                                const url = baseUrl + encodeURIComponent(query + "맛집");
                                let doc = Jsoup.connect(url).userAgent("Mozilla/5.0").get();

                                if (!doc) {
                                    replier.reply("네이버 검색 결과를 가져올 수 없습니다.");
                                    return;
                                }

                                // 2. 플레이스 목록 전체를 선택 (ul 태그, 클래스명은 변경될 수 있음)
                                //const placeList = doc.select("#place-main-section-root > section > div > div.rdX0R.HXTER > ul > li");
                                const placeList = doc.select("#_pcmap_list_scroll_container > ul > li");

                                if (placeList.isEmpty()) {
                                    replier.reply('[' + query + ']에 대한 맛집 정보를 찾을 수 없습니다.');
                                    return;
                                }

                                const restaurants = [];

                                // 3. 각 목록 아이템을 순회하며 정보 추출
                                for (let i = 0; i < placeList.size(); i++) {
                                    let item = placeList.get(i);

                                    // 3-1. 광고 아이템 제외
                                    const isAd = item.select("div.CHC5F > div.iqAyT.JKKhR > a");
                                    replier.reply(isAd);
                                    return;

                                    //if (isAd) {
                                    //    continue; // 광고일 경우 건너뛰기
                                    //}

                                    // 3-2. 가게 정보 추출
                                    const nameElement = item.select("div.CHC5F > div.bSoi3 > a > span.TYaxT").first();
                                    const categoryElement = item.select("div.CHC5F > div.bSoi3 > a > span.KCMnt").first();
                                    // const ratingElement = item.select("span.h6ehq").first(); // 별점
                                    const reviewElement = item.select("div.CHC5F > div.Dr_06 > div > span"); // 방문자/블로그 리뷰

                                    const name = nameElement.text();
                                    const category = categoryElement.text();

                                    replier.reply(name + '|' + category);
                                    // replier.reply(reviewElement.size());
                                    //  return;

                                    // 3-3. 텍스트에서 숫자만 추출 (데이터 정제)
                                    let rating = 0;
                                    if (reviewElement.get(1).includes("별점")) {
                                        rating = parseFloat(ratingElement.text().replace("별점", "").trim()) || 0;
                                    }

                                    let reviewCount = 0;
                                    const reviewText = reviewElement.text().replace(/[^0-9]/g, ""); // 숫자 이외의 문자 모두 제거
                                    if (reviewText) {
                                        reviewCount = parseInt(reviewText, 10);
                                    }

                                    // 별점과 리뷰 수가 모두 있어야 유효한 데이터로 간주
                                    if (rating > 0 && reviewCount > 0) {
                                        restaurants.push({
                                            name: name,
                                            category: category,
                                            rating: rating,
                                            reviewCount: reviewCount,
                                            // 자체 점수 계산: 별점의 가중치를 더 높게, 리뷰 수는 로그를 씌워 영향력을 조절
                                            score: rating * 100 + Math.log10(reviewCount + 1) * 20
                                        });
                                    }
                                }

                                // 4. 자체 점수(score) 기준으로 내림차순 정렬
                                restaurants.sort((a, b) => b.score - a.score);

                                // 5. 최종 결과 생성 (상위 5개)
                                let result = '🍽️ [' + query + '] 맛집 추천 TOP 5 🍽️\n';
                                result += "────────────────────\n\n";

                                const top5 = restaurants.slice(0, 5);

                                if (top5.length === 0) {
                                    replier.reply('[' + query + '] 에 대한 맛집 정보를 찾을 수 없습니다.');
                                    return;
                                }

                                top5.forEach((r, index) => {
                                    result += (index + 1).(r.name) + r.category + '\n';
                                    result += '⭐️ ' + r.rating + ' / 💬 리뷰 ' + r.reviewCount.toLocaleString() + '개\n\n';
                                });

                                replier.reply(result.trim());

                            } catch (e) {
                                Log.e("맛집 검색 오류: " + e);
                                replier.reply("맛집을 검색하는 중 오류가 발생했습니다.\n" + e);
                            }
                        }
                        else if (msg === "/지식인") {
                            let knowledge = getRandomIN();
                            replier.reply(" ** 랜덤지식인 **\n============================\n[Q]: " + knowledge[0] + "\n\n[A]: " + knowledge[1]);
                        }
                        else if (msg.startsWith("/주식 ")) {
                            const code = msg.substring(4).trim();

                            // 종목 코드가 6자리 숫자인지 간단히 확인
                            if (!/^\d{6}$/.test(code)) {
                                replier.reply("올바른 종목코드(6자리 숫자)를 입력해주세요.\n(예: /주식 005930)");
                                return;
                            }

                            replier.reply('[' + code + '] 종목 정보를 조회합니다...');

                            //  try {
                            const stockInfo = getStockInfo(code);
                            replier.reply(stockInfo);
                            //  } catch (e) {
                            //      Log.e("주식 정보 조회 오류 (" + code + "): " + e);
                            //      replier.reply("정보를 가져오는 중 오류가 발생했습니다.\n종목코드가 올바른지 확인해주세요.");
                            //  }
                        }
                    }
                }

            }
            else {
                replier.reply("잘못된 명령어입니다.\n'/명령어'를 사용하여 명령어를 확인해 주세요.");
                if ((roomGradeDB[room] >= 2 || userPoint >= POINT_GRADE_2)
                    || (roomGradeDB[room] >= 3 || userPoint >= POINT_GRADE_3)
                    || (ADMIN_NAME.includes(sender) || MANAGER_NAME.includes(sender))) {
                    handleInvalidCommand(chatLogDB, room, msg, replier);
                }

                try {
                    FileStream.write(LOG_FILE_PATH, JSON.stringify(chatLogDB, null, 4));    // null, 4는 JSON을 예쁘게 포맷팅
                } catch (e) {
                    Log.e("DB 파일 저장 오류: " + e);
                }
            }
        }

        // 현재 진행 중인 게임이 있을 경우, 모든 메시지를 정답으로 간주하고 확인
        else if (ongoingGames[room]) {
            let game = ongoingGames[room];
            let result_cont = '';
            let correct = false;

            // 게임 종류에 따라 정답 확인
            switch (game.type) {
                case 'updown':
                    const userGuess = parseInt(msg, 10);
                    if (!isNaN(userGuess)) {
                        if (userGuess === game.answer) {
                            correct = true;
                            result = '🏆 [' + sender + ']님 정답!\n정답은 [' + game.answer + ']이었습니다.)';
                        } else if (userGuess > game.answer) {
                            replier.reply("다운(DOWN) 👇");
                        } else {
                            replier.reply("업(UP) 👆");
                        }
                    }
                    break;

                case 'sentence':
                case 'space':
                    if (msg.trim() === game.answer) {
                        correct = true;
                        result_cont = '🏆 [' + sender + ']님 정답!';
                    }
                    break;

                case 'chosung':
                case 'nonsense':
                case 'emotion':
                    if (msg.trim().replace(/\s/g, '') === game.answer.replace(/\s/g, '')) { // 띄어쓰기 무시하고 비교
                        correct = true;
                        result_cont = '🏆 [' + sender + ']님 정답!';
                    }
                    break;

                case 'sqld':
                    if (msg.startsWith('.답 ')) {
                        let arg_answer = msg.split(" ");
                        if (arg_answer[1] === game.answer) {
                            correct = true;
                            result_cont = '🏆 [' + sender + ']님 정답!';
                        } else {
                            game.attempts--;
                            if (game.attempts > 0) {
                                replier.reply('땡! 기회가 ' + game.attempts + '번 남았습니다.');
                            } else {
                                replier.reply('아쉽네요! 모든 기회를 사용했습니다.\n정답은 [' + game.answer + ']이었습니다.');
                                delete ongoingGames[room];
                            }
                        }
                    }
                    break;

                case 'baseball':
                    // 1. 입력값 유효성 검사
                    if (msg.length !== 4 || isNaN(msg)) {
                        // 4자리 숫자가 아니면 무시 (힌트나 다른 채팅일 수 있음)
                        break;
                    }
                    const guess = msg.split('').map(Number);
                    if (new Set(guess).size !== 4 || guess.includes(0)) {
                        replier.reply("중복 없이 1~9 사이의 숫자 4개를 입력해주세요.");
                        break;
                    }

                    // 2. 스트라이크, 볼 판정
                    let strike = 0;
                    let ball = 0;
                    for (let i = 0; i < 4; i++) {
                        if (game.answer[i] === guess[i]) {
                            strike++;
                        } else if (game.answer.includes(guess[i])) {
                            ball++;
                        }
                    }

                    // 3. 결과 알림
                    game.attempts--;
                    if (strike === 4) {
                        correct = true;
                        result_cont = "⚾️ " + strike + "S " + ball + "B ⚾️";
                        result_cont += "\n🏆 [" + sender + "]님 🎉 홈런입니다!!";
                    } else if (game.attempts > 0) {
                        replier.reply("⚾️ " + strike + "S " + ball + "B ⚾️\n(남은 기회: " + game.attempts + "번)");
                    } else {
                        replier.reply("⚾️ " + strike + "S " + ball + "B ⚾️");
                        replier.reply("아쉽네요! 모든 기회를 사용했습니다.\n정답은 [" + game.answer.join('') + "]였습니다.");
                        delete ongoingGames[room];
                    }
                    break;
            }

            // 정답을 맞혔을 경우 공통 처리
            if (correct) {
                score = game.type === 'sqld' ? S_GAME_POINT : GAME_POINT;
                result_cont += '\n(획득 포인트 +' + score + ', 현재: ' + setUserPoint(room, sender, score) + '점)';
                replier.reply(result_cont);
                delete ongoingGames[room]; // 게임 종료
            }

        }
        else {
            if (msg.startsWith("굿모닝")) {
                let morningTxt = "🌞 좋은 아침입니다! ☺️\n오늘도 좋은 일만 가득하시길 빌겠습니다. :)";
                try {
                    if (msg.includes("인사")) {
                        morningTxt += "\n\n" + getWeatherSearch("전국");
                    }
                } catch (e) {
                    // 7. 예외 처리 (오류 발생 시)
                    morningTxt += "";
                }
                replier.reply(morningTxt);
            }
            else if (msg.startsWith("밥먹자")) {
                if (msg.includes("먹고살려")) {
                    replier.reply("벌써 시간이 이렇게…\n🍚 식사는 드신거죠?! 🍱");
                }
                else if (msg.includes("쉬자")) {
                    replier.reply("힘드셨죠? ;(\n오늘도 고생 많으셨어요.\n🌛 평안한 밤 되시길 빌겠습니다. ⭐");
                }
            }
        }
    }
