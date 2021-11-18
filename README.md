# fairy-video-tools

# インストール
## 1.  レポジトリをクローンする
```bash
# クローン
$ git clone https://github.com/aimedical/fairy-video-tools.git
$ cd fairy-video-tools

# インストーラの作成
$ yarn make
```
* `yarn`はインストールが必須です ( [yarn - Installation](https://classic.yarnpkg.com/en/docs/install#windows-stable) )
## 2.  インストール
`fairy-video-tools/out/make/deb/x64` 配下の
`fairy-video-tools_1.0.0_amd64.deb` を実行します

# 前準備
## `sudo`コマンドをパスワードなしで実行できるように設定する

> [sudo のパスワードを入力なしで使うには](https://qiita.com/RyodoTanaka/items/e9b15d579d17651650b7)

```bash
# visudoの起動
$ sudo visudo
```

起動したら最終行に以下を追記します (`<username>` はユーザー名に置き換える)

```plain
<username> ALL=NOPASSWD: ALL
```

追記したら Ctrl + X で保存し、終了します

## HDDの自動マウントをオフにする

> [Disable automount on Ubuntu](https://linuxconfig.org/how-to-disable-gui-desktop-usb-automount-on-linux-system)

```bash
# マウントをオフにできるGUIツールのインストール
$ sudo apt update
$ sudo apt install dconf-editor

# 起動
$ dconf-editor
```
/ org / gnome / desktop / media-handling にある以下の項目をオフにします
- automount
- automount-open

# 操作
メニューの切り替えは左のサイドバーで行います  
一番上のアイコンでメニュー名の表示/非表示を切り替えます
> TODO
> - [ ] サイドバー開閉時, UIが崩れてしまうことの対処

## Device Strages
10連のHDDタワーをGUIで操作するためのメニューです  
以下のことが行えます

* 配置, ディスクのパス, マウントポイントの確認
* マウント（Read Only / Read Write）
* アンマウント
* 電源オフ

電源のオンオフ、マウントの有無などは自動的に更新されますが、`RELOAD`ボタンで手動更新もできます
#### 注意
- HDD使用中のアンマウントやアンマウント前の電源オフは行わないでください（エラーが表示されます）

## Disk Copy
HDDをコピーするためのメニューです

---
### コピー元 / コピー先
  - コピー元 / コピー先をそれぞれマウントポイント（またはパス）で指定します
  - 空などにより未マウントのHDDはコピー先にパスで表示されます
  - コピー元にはRead OnlyでマウントされているHDDしか表示されません
### Options
コピー後の処理を指定するオプションです
- Optionsは上の処理が指定されていない場合は指定できないようになっています
### HDDを整理する
コピー先のHDD内を所定の階層に整理します
  - 施設名・部屋番号を入力しないと実行できません
  - 施設名・部屋番号には**半角英数字と_（アンダーバー）のみ**が使用できます
### precheck動画を作成する
HDD内にプレビュー動画を作成します
### Excelを作成する
HDD内にExcelファイルを作成します
- ファイル名を入力しないと実行できません
- ファイル名には**半角英数字と_（アンダーバー）-（ハイフン）のみ**が使用できます
### NASにアップロードする
文字通りNASにアップロードします
- アップロード先はpreview直下です（暫定）
---
オプションの設定が完了したら`実行`ボタンで実行します  
実行中は`中断`ボタンで中断できます  
実行中はコピーの設定を変更することはできません  
コピー先が空のディスクの場合、フォーマットするかのポップアップが表示されます（フォーマットしないと続行できません）  
現在の進行状況はログとして表示されます  
HDD整理・precheck動画の作成時に所定の名前でない動画が存在した場合はそのログが別タブに表示されます
#### 注意
- フォーマット中は中断ボタンを押さないでください
    > TODO
    > - [ ] フォーマット中は`中断`ボタンをdisabledにする

- 実行中はプログレスバーが表示されますが、動画のコピーなど重い処理がある場合はその完了後に更新されるため、正確な進捗ではありません