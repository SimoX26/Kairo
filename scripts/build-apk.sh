#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_apk="$project_dir/android/app/build/outputs/apk/debug/app-debug.apk"
target_dir="$project_dir/artifacts"
target_apk="$target_dir/Kairo.apk"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" && ! -f "$project_dir/android/local.properties" ]]; then
  default_sdk="$HOME/Android/Sdk"

  if [[ -d "$default_sdk" ]]; then
    export ANDROID_HOME="$default_sdk"
  else
    printf 'Android SDK non trovato. Configura ANDROID_HOME o android/local.properties.\n' >&2
    exit 1
  fi
fi

cd "$project_dir"
npm run android:sync

cd android
./gradlew assembleDebug

mkdir -p "$target_dir"
cp "$source_apk" "$target_apk"

printf 'APK generato: %s\n' "$target_apk"
