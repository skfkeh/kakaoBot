/**
 * 파일명: advanced_bot_v3.3.js
 * 설명: 날씨 기능 및 AI 검색 기능 포함 (AI가 항상 한국어로 답변하도록 수정)
 * 작성자: AI Ass istant
 * 버전: 3.3.0
 */

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


const DB_PATH = "sdcard/msgbot/database/attendance.json"; // 데이터 파일 경로 (이 경로에 파일이 생성됩니다)
const ADMIN_NAME = "정승환"; // 출석부 초기화 권한을 가질 관리자 이름

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

// 전체 출석 데이터를 불러오는 함수
function loadAttendanceData() {
    let content = FileStream.read(DB_PATH);
    if (content === null) {
        return {}; // 파일이 없으면 빈 객체 반환
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
// ==================== 옷차림 추천 함수 ====================
/**
 * 기온에 따라 옷차림을 추천하는 문구를 반환합니다.
 * @param {number} temp - 현재 기온 (숫자)
 * @returns {string} - 옷차림 추천 문구
 */
function getClothingRecommendation(temp) {
    if (temp >= 28) {
        return "민소매, 반바지, 원피스를 추천해요. 더위 조심하세요!";
    } else if (temp >= 23) {
        return "반팔, 얇은 셔츠, 반바지, 면바지가 좋겠어요.";
    } else if (temp >= 17) {
        return "얇은 긴팔이나 가디건, 맨투맨, 청바지가 알맞아요.";
    } else if (temp >= 12) {
        return "자켓, 가디건, 야상, 니트, 스타킹을 챙기세요.";
    } else if (temp >= 9) {
        return "트렌치코트, 야상, 니트, 기모 후드티가 필요한 날씨예요.";
    } else if (temp >= 5) {
        return "코트, 가죽자켓, 히트텍, 니트 등 따뜻하게 입으세요.";
    } else {
        return "패딩, 두꺼운 코트, 목도리, 장갑은 필수! 감기 조심하세요.";
    }
}

/**
 * JSON 문자열에 포함될 수 있는 특수문자를 이스케이프 처리합니다.
 * @param {string} str - 원본 문자열
 * @returns {string} - 이스케이프 처리된 문자열
 */
function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}
// =======================================================

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 메시지가 '/'로 시작하는 경우에만 명령어 처리를 시작합니다.
    if (msg.startsWith('/')) {
      // 1. 명령어 확인
      if (msg.startsWith("/날씨 ")) {
          // 2. 지역 이름 추출
          let location = msg.substring(4).trim(); // "/날씨 " 다음의 모든 텍스트를 지역으로 간주

          if (location === "") {
              replier.reply("지역 이름을 입력해주세요.\n(예: /날씨 서울)");
              return;
          }

          try {
              // 3. 네이버 날씨 정보 크롤링
              const url = "https://search.naver.com/search.naver?query=" + encodeURI(location + " 날씨");
              
              // Jsoup.connect()를 사용하여 웹 페이지에 접속하고 HTML 문서를 가져옴
              // .get()은 GET 방식으로 요청함
              const doc = Jsoup.connect(url)
                              .userAgent("Mozilla/5.0") // User-Agent를 설정하여 로봇 차단을 피함
                              .get();

              // 4. 필요한 정보 추출 (CSS Selector 사용)
              // Selector는 네이버 웹페이지 구조가 바뀌면 수정해야 할 수 있습니다.

              // 현재 위치 (예: "서울특별시 용산구 한강대로")
              const currentLoc = doc.select("h2.title").first().text();
              if (currentLoc == null) {
                  replier.reply(
                      "지역 정보가 잘못되었습니다. 😥\n '" + location + "'이(가) 맞는지 다시 확인해주세요.");
                  return;
              }

              // 현재 온도
              const currentTemp = doc.select("div.temperature_text > strong").first().text().replace("현재 온도", "").trim();

              // 날씨 설명 (예: "흐림, 어제보다 2.1° 높아요")
              try {
                  const weatherDesc = doc.select("div.weather_info > div > span.weather").first().text();  
              }
              catch (e) {
                  weatherDesc = null;
              }
              
              // 체감, 습도, 풍속 정보
              const summaryList = doc.select("dl.summary_list > dd");
              const sensibleTemp = summaryList.get(0).text(); // 체감 온도
              const humidity = summaryList.get(1).text(); // 습도
              const wind = summaryList.get(2).text(); // 풍속
              
              /*  // 현재는 오류 발생하는 듯. 차후 수정
              // "체감" 이라는 글자가 포함된 dt 태그 바로 다음에 오는 dd 태그를 찾음
              const sensibleTempElement = weatherArea.select("dt:contains(체감) + dd").first();
              const sensibleTemp = sensibleTempElement != null ? sensibleTempElement.text() : "정보 없음";

              // "습도" 라는 글자가 포함된 dt 태그 바로 다음에 오는 dd 태그를 찾음
              const humidityElement = weatherArea.select("dt:contains(습도) + dd").first();
              const humidity = humidityElement != null ? humidityElement.text() : "정보 없음";
              
              // "풍속" 이라는 글자가 포함된 dt 태그 바로 다음에 오는 dd 태그를 찾음
              const windElement = weatherArea.select("dt:contains(풍속) + dd").first();
              const wind = windElement != null ? windElement.text() : "정보 없음";
              */
              
              // 미세먼지, 초미세먼지 정보
              const dustInfo = doc.select("ul.today_chart_list > li > a > span.txt");
              const fineDust = dustInfo.get(0).text(); // 미세먼지
              const ultraFineDust = dustInfo.get(1).text(); // 초미세먼지
              
              // 시간대별 강수확률 (가장 가까운 시간대 정보 가져오기)
              // 시간별 예보 테이블에서 첫 번째 행의 강수확률을 가져옵니다.
              const rainProbHeader = doc.select("th > span.rainfall").first(); // "강수" 헤더
              let rainProbability = "정보 없음";
              if (rainProbHeader != null) {
                  // "강수" 헤더가 있는 행(tr)을 찾아, 그 행의 첫 번째 데이터(td)의 값을 가져옴
                  rainProbability = rainProbHeader.parent().parent().nextElementSibling().select("td > span.rainfall").first().text();
              }

              // ==================== 옷차림 추천 로직 추가 ====================
              let clothingTip = "";

              try {
                  // '23.5°' 같은 문자열에서 숫자 부분만 추출
                  const tempNum = parseFloat(currentTemp.replace("°", ""));
                  if (!isNaN(tempNum)) { // 숫자로 변환이 성공했을 경우에만 실행
                      clothingTip = getClothingRecommendation(tempNum);
                  }
              } catch (e) {
                  // 온도 파싱 중 오류 발생 시 아무것도 하지 않음
              }
              // ===========================================================

              // 5. 결과 메시지 조립
              let result = "📍 [" + location + "] 날씨 정보\n";
              result += "====================\n\n";
              
              result += "▪️ 위치: " + currentLoc + "\n\n";
              
              result += "🌡️ 현재 " + currentTemp + " (" + weatherDesc + ")\n";
              result += "  - 체감: " + sensibleTemp + "\n";
              result += "  - 습도: " + humidity + "\n";
              result += "  - 풍속: " + wind + "\n\n";

              result += "😷 대기 정보\n";
              result += "  - 미세먼지: " + fineDust + "\n";
              result += "  - 초미세먼지: " + ultraFineDust + "\n\n";
              
              result += "💧 예상 강수 확률\n";
              result += "  - " + rainProbability + "\n\n";
              
              // 옷차림 추천 문구가 있을 경우에만 결과에 추가
              if (clothingTip !== "") {
                  result += "👕 오늘의 옷차림 추천\n";
                  result += "  - " + clothingTip + "\n\n";
              }
              
              result += "자료: 네이버 날씨";

              // 6. 메시지 전송
              replier.reply(result);

          } catch (e) {
              // 7. 예외 처리 (오류 발생 시)
              // Log.e(e); // 디버깅 시 로그 확인
              replier.reply(
                  "'" + location + "'의 날씨 정보를 가져오는 데 실패했습니다.\n" +
                  "지역 이름을 확인하시거나 잠시 후 다시 시도해주세요."
              );
          }
      }
      
      // ==================== /검색 기능 (한국어 답변 고정) ====================
      else if (msg.startsWith("/검색 ")) {
          if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") { replier.reply("AI 기능이 아직 설정되지 않았습니다.\n스크립트 파일에 Gemini API 키를 입력해주세요."); return; }
          let query = msg.substring(4).trim();
          if (query === "") { replier.reply("검색할 내용을 입력해주세요.\n(예: /검색 대한민국의 수도는?)"); return; }

          replier.reply("AI가 생각 중입니다... 🧠\n(최대 30초 정도 소요될 수 있습니다)");

          try {
              const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY;
              
              const url2 = new URL(apiUrl);
              const conn = url2.openConnection();
              conn.setRequestMethod("POST");
              conn.setRequestProperty("Content-Type", "application/json; charset=utf-8"); // Content-Type에 charset=utf-8 추가
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
              const responseReader = (responseCode === 200) ? 
                  new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8")) : 
                  new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));

              let line;
              const response = new java.lang.StringBuffer();
              while ((line = responseReader.readLine()) != null) { response.append(line); }
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
      } else if (msg.trim() === "/검색") {
          replier.reply("[AI 검색 도움말]\n/검색 [질문 내용]\n(예: /검색 아인슈타인에 대해 알려줘)");
      }
      
      // "/날씨"만 입력했을 경우 도움말
      if (msg.trim() === "/날씨") {
          replier.reply("[날씨 명령어 도움말]\n/날씨 [지역이름]\n(예: /날씨 강남, /날씨 부산 해운대구)");
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
                  return; // 출석 정보를 변경할 필요 없으므로 여기서 종료
                  
              } else if (userData.lastCheckIn === yesterday) {
                  userData.streak += 1;
                  userData.lastCheckIn = today;
                  replier.reply(
                      "✅ " + sender + "님, 출석체크 완료!\n" +
                      "🔥 연속 " + userData.streak + "일째 출석 중입니다! 대단해요!"
                  );
                  
              } else {
                  userData.streak = 1;
                  userData.lastCheckIn = today;
                  replier.reply(
                      "✅ " + sender + "님, 오랜만에 오셨네요!\n" +
                      "😭 아쉽지만 연속 출석이 초기화되었어요.\n" +
                      "오늘부터 다시 1일차 시작!"
                  );
              }
          }
          
          // 4. 변경된 유저 데이터를 전체 데이터에 반영
          allData[sender] = userData;
          
          // 5. 전체 데이터를 파일에 저장
          saveAttendanceData(allData);
      }
      else if (msg === "/출첵초기화" && sender === ADMIN_NAME) {
          FileStream.remove(DB_PATH);
          replier.reply("✅ 모든 출석 데이터가 초기화되었습니다.");
          return; // 명령어 처리 후 함수 종료
      }
      else if (msg.startsWith("/명령어")) {
          retMsg = "현재 사용 가능한 명령어는 다음과 같습니다."
          retMsg += "\n\n✅ /ㅊㅊ or /출첵: 출석체크";
          retMsg += "\n🌦 /날씨 (지역) : 지역 날씨 검색";
          retMsg += "\n🤖 /검색 (검색 내용): GPT를 활용한 내용 검색";
          retMsg += "\n\n추가적인 기능은 관리자에게 요청하시면 빠른 시일 내에 생성해드리겠습니다.";
          replier.reply(retMsg);
          return; // 명령어 처리 후 함수 종료
      }
}