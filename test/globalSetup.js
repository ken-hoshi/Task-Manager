// テストを動かす場所のタイムゾーンに結果が左右されないよう、アプリの利用者と同じ日本時間に固定する
// （setupFilesAfterEnv では Date が読まれたあとになり間に合わないので、globalSetup で設定する）
module.exports = async () => {
  process.env.TZ = "Asia/Tokyo";
};
