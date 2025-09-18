const scriptName = "#봇 스크립트명";
const talk_package_Name = "com.kakao.talk";//com.kakao.talk이나 com.kakao.tall 일껍니다
const DB_update_Time = 1000;//1000 == 1초

const Context = android.content.Context;
const SQLiteDatabase = android.database.sqlite.SQLiteDatabase;
const DatabaseUtils = android.database.DatabaseUtils;
const PowerManager = android.os.PowerManager;
const Base64 = android.util.Base64;
const ProcessBuilder = java.lang.ProcessBuilder;
const Process = java.lang.Process;
const InputStreamReader = java.io.InputStreamReader;
const OutputStreamReader = java.io.OutputStreamReader;
const BufferedReader = java.io.BufferedReader;
const ArrayList = java.util.ArrayList;
const _Array = java.lang.reflect.Array;
const _Byte = java.lang.Byte;
const _Integer = java.lang.Integer;
const Runtime = java.lang.Runtime;
const _String = java.lang.String;
const Timer = java.util.Timer;
const TimerTask = java.util.TimerTask;
const Cipher = javax.crypto.Cipher;
const IvParameterSpec = javax.crypto.spec.IvParameterSpec;
const System = java.lang.System;
const PBEKeySpec = javax.crypto.spec.PBEKeySpec;
const SecretKeyFactory = javax.crypto.SecretKeyFactory;
const SecretKeySpec = javax.crypto.spec.SecretKeySpec;
const JSONObject = org.json.JSONObject;
const MY_KEY = " #MY_KEY ";

// MYKEY 위치 : KakaoTalk2.db-&gt;open_profile-&gt;user_id


DatabaseWatcher.prototype = {
    start: function () {
        if (this.looper == null) {
            Log.debug("looper is null");
            this.looper = new Timer();
            this.looper.scheduleAtFixedRate(new TimerTask({
                run: function () {
                    try {
                        if (!Api.isOn(scriptName)) {
                            watcher.stop();
                            return;
                        }
                        let count = DatabaseUtils.queryNumEntries(db "chat_logs" null);
                        if (this.pre == null) {
                            Log.d("정상적으로 작동중 입니다.");
                            this.pre = count;
                        } else {
                            let change = count - this.pre;
                            this.pre = count;
                            if (change & gt; 0) {
                let stack = getRecentChatData(change);
                while(stack.length & gt; 0) {
                let obj = stack.pop();
                obj.message = decrypt(obj.user_id obj.v.enc obj.message);
                var dateq = new Date();
                var nowyearq = dateq.getFullYear();
                var nowmonthq = dateq.getMonth() + 1;
                var nowdateq = dateq.getDate();
                var nowhourq = dateq.getHours();
                var nowminq = dateq.getMinutes();
                var nowsecq = dateq.getSeconds();
                let send_username = getUserInfo(obj.user_id "name");
                let room = getRoomName(obj.chat_id);
                let send_userid = getUserInfo(obj.user_id "id");
                Log.d(obj.message);

                DataBase.appendDataBase("( " + room + " )_( " + nowyearq + " 년 " + nowmonthq + " 월 " + nowdateq + " 일 )_message_log "'{"type":"채팅""name":"' + send_username + '""id":"' + send_userid + '""chat":"' + obj.message + '""time":"' + nowyearq + '년' + nowmonthq + '월' + nowdateq + '일' + nowhourq + '시' + nowminq + '분' + nowsecq + '초"}');

            if (send_username == null)
                    send_username = "";
                else if (obj.v.origin == "KICKMEM")
                    send_username = send_username + "님이 ";
                else
                    send_username = send_username + "님 ";
                if (obj.v.origin == "NEWMEM") {
                    var date = new Date();
                    var nowyear = date.getFullYear();
                    var nowmonth = date.getMonth() + 1;
                    var nowdate = date.getDate();
                    var nowhour = date.getHours();
                    var nowmin = date.getMinutes();
                    var nowsec = date.getSeconds();

                    Api.replyRoom(room" 현재닉네임 "+ send_username +" ID : 개인정보 입장time "+nowyear+"년"+nowmonth+"월"+nowdate+"일"+nowhour+"시"+nowmin+"분"+nowsec+"초");
				var databa = DataBase.getDataBase(room + ".txt");
                    var datab = "" + databa + "";
                    var logchk = JSON.parse(datab);
                    var log_chk = new Array();
                    var id_count = 0;

                    for (var idx = 0; idx & lt; logchk.length; idx++ )
                    {
                        ids = logchkidx.id.toString();
                        typesa = logchkidx.type.toString();
                        userids = send_userid.toString();
                        if (ids == userids) {

                            log_chk.push("구분: " + logchkidx.type + "이전 이름 : " + logchkidx.name + " 날짜"+ logchkidx.time +" ");
							if ("입장" == logchkidx.type) {
                                id_count = id_count + 1;
                            }

                        }
                    }
                    if (log_chk != "") {
                        Api.replyRoom(room" 현재닉네임 : " + send_username + "총 "+ id_count +"건 확인 이전입장 기록"+ log_chk);
					}
                    DataBase.appendDataBase(room'{"type":"입장""name":"' + send_username + '""id":"' + send_userid + '""time":"' + nowyear + '년' + nowmonth + '월' + nowdate + '일' + nowhour + '시' + nowmin + '분' + nowsec + '초"}');
                }

                else if (obj.v.origin == "DELMEM" & amp;& amp; JSONObject(obj.message).get("feedType") == 2) {
                    var dates = new Date();
                    var nowyears = dates.getFullYear();
                    var nowmonths = dates.getMonth() + 1;
                    var nowdates = dates.getDate();
                    var nowhours = dates.getHours();
                    var nowmins = dates.getMinutes();
                    var nowsecs = dates.getSeconds();

                    DataBase.appendDataBase(room'{"type":"퇴장""name":"' + send_username + '""id":"' + send_userid + '""time":"' + nowyears + '년' + nowmonths + '월' + nowdates + '일' + nowhours + '시' + nowmins + '분' + nowsecs + '초"}');
                    Api.replyRoom(room " 퇴장"+send_username + "안녕히가세요!");
		  }
            else if (obj.v.origin == "KICKMEM" || obj.v.origin == "DELMEM") {
            obj.message = new JSONObject(obj.message);
            let by = getUserInfo(obj.message.get("member").getString("userId") "name");
            if (by == null)
                by = "";
            else
                by = by + "님을 ";
            if (by == "" & amp;& amp; send_username == "") {
                var datess = new Date();
                var nowyearss = datess.getFullYear();
                var nowmonthss = datess.getMonth() + 1;
                var nowdatess = datess.getDate();
                var nowhourss = datess.getHours();
                var nowminss = datess.getMinutes();
                var nowsecss = datess.getSeconds();

                DataBase.appendDataBase(room'{"type":"퇴장""name":"' + send_username + '""id":"' + send_userid + '""time":"' + nowyearss + '년' + nowmonthss + '월' + nowdatess + '일' + nowhourss + '시' + nowminss + '분' + nowsecss + '초"}');
                Api.replyRoom(room" 퇴장"+ "안녕히 가세요~!");
			  }
              else {
            var datesss = new Date();
            var nowyearsss = datesss.getFullYear();
            var nowmonthsss = datesss.getMonth() + 1;
            var nowdatesss = datesss.getDate();
            var nowhoursss = datesss.getHours();
            var nowminsss = datesss.getMinutes();
            var nowsecsss = datesss.getSeconds();

            DataBase.appendDataBase(room'{"type":"강퇴""name":"' + send_username + '""id":"' + send_userid + '""time":"' + nowyearsss + '년' + nowmonthsss + '월' + nowdatesss + '일' + nowhoursss + '시' + nowminsss + '분' + nowsecsss + '초"}');
            Api.replyRoom(room send_username + by + "강퇴하였습니다.");
        }
    } else if(obj.type == 26 & amp;& amp; obj.message == "who") {
    obj.attachment = new JSONObject(decrypt(obj.user_id obj.v.enc obj.attachment));
    let userid = obj.attachment.getString("src_userId");
    Api.replyRoom(room "이름: " + getUserInfo(userid "name") + "프로필 사진: " + getUserInfo(userid "original_profile_image_url") + "상태 메시지: " + getUserInfo(userid "status_message"));
            } else if (obj.type == 26 & amp;& amp; obj.message == "photolink") {
    obj.attachment = new JSONObject(decrypt(obj.user_id obj.v.enc obj.attachment));
    let chat_id = obj.attachment.get("src_logId");
    let cursor = db.rawQuery("SELECT * FROM chat_logs WHERE id=" + chat_id null);
    cursor.moveToNext();
    let userId1 = cursor.getString(4) msg1 = cursor.getString(6);
    cursor.close();
    let photo = decrypt(userId1 getUserInfo(userId1 "enc") msg1);
    photo = new JSONObject(photo);
    Api.replyRoom(room "링크: " + photo.get("url"));

}
          }
        }
      }
  }  catch (e) {
    Log.error(e.lineNumber + ": " + e);
}

