import React, { useMemo } from 'react';
import { View, Dimensions, NativeModules } from 'react-native';
// Note: WebView wird dynamisch via require geladen, kein statischer Import!

export default function VoiceAnimation() {
  const hasWebView = !!(NativeModules as any)?.RNCWebViewModule;
  if (!hasWebView) {
    return null;
  }
  const { width, height } = Dimensions.get('window');
  const ringRadius = 120; // aus SiriSkia
  const centerY = height / 2;
  const containerTop = Math.min(height - 100 - 12, centerY + ringRadius + 8); // unter dem Kreis, aber im Screen
  const containerLeft = Math.max(0, Math.floor((width - ringRadius * 2) / 2));
  const html = useMemo(() => `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <style>
        html,body{margin:0;padding:0;background:transparent;}
        #wave{width:100%;height:100%;margin:0 auto;}
      </style>
    </head>
    <body>
      <div id="wave"></div>
      <script>
        (function(){
          function post(msg){
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage){
              try{ window.ReactNativeWebView.postMessage(String(msg)); }catch(e){}
            }
          }
          window.onerror = function(m,s,l,c,e){ post('ERR:'+m+'@'+s+':'+l); };
          console.log = (f=>function(){ try{ post('LOG:'+Array.from(arguments).join(' ')); }catch(e){}; return f.apply(console,arguments); })(console.log);
          console.error = (f=>function(){ try{ post('ERR:'+Array.from(arguments).join(' ')); }catch(e){}; return f.apply(console,arguments); })(console.error);

          function boot(){
            try{
              var el = document.getElementById('wave');
              var wave = new window.SiriWave({
                container: el,
                width: el.clientWidth || 320,
                height: el.clientHeight || 100,
                style: 'ios9',
                color: '#00BFFF',
                autostart: true
              });
              window.wave = wave;
              post('READY');
            }catch(e){ post('BOOT_FAIL:'+e.message); }
          }

          function loadScript(src, cb){
            var s = document.createElement('script'); s.src = src; s.async = true; s.onload = cb; s.onerror = function(){ post('LOAD_FAIL:'+src); cb(false); };
            document.body.appendChild(s);
          }

          // Try jsDelivr first, fallback to unpkg
          loadScript('https://cdn.jsdelivr.net/npm/siriwave@2/dist/siriwave.umd.min.js', function(ok){
            if (window.SiriWave) return boot();
            loadScript('https://unpkg.com/siriwave/dist/siriwave.umd.min.js', function(){
              if (window.SiriWave) return boot();
              post('NO_LIB');
            });
          });
        })();
      </script>
    </body>
  </html>`, []);

  return (
    <View style={{ width: ringRadius * 2, height: 100, position: 'absolute', top: containerTop, left: containerLeft, pointerEvents: 'none' as any, zIndex: 1000 }}>
      {(() => {
        try {
          const WebView = (require('react-native-webview').WebView) as any;
          return (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
              style={{ backgroundColor: 'transparent' }}
              javaScriptEnabled
              scalesPageToFit={false}
              scrollEnabled={false}
              onMessage={(e: any) => {
                // eslint-disable-next-line no-console
                console.log('[SiriWave-WebView]', e.nativeEvent.data);
              }}
            />
          );
        } catch (_e) {
          return null;
        }
      })()}
    </View>
  );
}


