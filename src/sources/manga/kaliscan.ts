import { ContentType } from "../../core/source-manager";
import MadThemeCommon from "./common/multi/mad-theme";

export default class KaliScanSource extends MadThemeCommon {
  name: string = "KaliScan";
  icon: string =
    "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/kaliscancom/res/mipmap-xhdpi/ic_launcher.png";

  mirrors: string[] = [
    "https://kaliscan.com",
    "https://kaliscan.me",
    "https://kaliscan.io",
  ];

  contentType: ContentType = ContentType.NSFW
}
