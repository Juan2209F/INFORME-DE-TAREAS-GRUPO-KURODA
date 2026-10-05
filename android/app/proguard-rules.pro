# Los métodos que la página llama por window.GKAndroid no se deben renombrar ni quitar.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
