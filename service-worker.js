var CONTENT_CACHE_VERSION = 'content_v1.0.5';

this.addEventListener('install', (eve) => {
    log.info(`oninstall event: CONTENT_CACHE_VERSION=${CONTENT_CACHE_VERSION}`);
    
    eve.waitUntil(
        caches.open(CONTENT_CACHE_VERSION)
        .then((cache) => {
            return cache.addAll(
                [
                    '/index.html',
                ]
            )
        })
        .catch((err) => {

        })
    )
});

this.addEventListener('activate', (eve) => {
    log.info(`onactivate event:`, eve);

    // 当前需要保留的缓存
    let whiteList = [CONTENT_CACHE_VERSION];

    let deleteOtherCachePromise = caches.keys().then((cacheNames) => {
        log.info('当前缓存：' + cacheNames);

        return Promise.all(cacheNames.map((cacheName) => {
            if(whiteList.indexOf(cacheName) === -1){
                log.info('删除缓存: '+ cacheName);
                return caches.delete(cacheName);
            }
        }));
    });
    // 删除其他版本的cache
    eve.waitUntil(deleteOtherCachePromise);
});

this.addEventListener('push', function(eve){
    log.info(`onpush event:`, eve);
    var title = 'Yay a message.';  
    var body = 'We have received a push message.';  
    var icon = '/pwa-example/source/icon/homescreen192.png';  
    var tag = 'simple-push-demo-notification-tag';

    eve.waitUntil(  
        self.registration.showNotification(title, {  
            body: body,
            icon: icon,
            tag: tag
        })  
    );  
});

this.addEventListener('sync', function(eve){
    log.info(`onsync event:`, eve);
});

this.addEventListener('fetch', (eve) => {
    let req = eve.request;

    log.access(req.method, req.url);
});

this.addEventListener('fetch', (eve) => {
    let req = eve.request;
    let url = req.url;

    if(url.indexOf('/api/') !== -1){
        // 如果是数据接口，采用`网络优先`策略
        eve.respondWith(
            fetch(req).then((res) => {
                console.log('fetch api result:', res);
                if(!res || res.status >= 400/* || res.type !== 'basic'*/) {
                    log.error("[fetch handler] etch error: " + (res && res.status))
                    return res;
                }

                return caches.open(CONTENT_CACHE_VERSION).then((cache) => {
                    log.info(`添加API缓存: ${url}`);
                    cache.put(req, res.clone())
                    return res
                });
            }).catch((err) => {
                log.warn('API 请求失败, 返回缓存的结果');
                return caches.match(req);
            })
        )
    }else{
        // 其他资源，采用`缓存优先`策略
        eve.respondWith(
            // 缓存的资源
            caches.match(req)
            .then((res) => {
                if(res){
                    log.info(`已经返回缓存的资源, url: ${res.url}`);
                    return res;
                }else{
                    log.warn(`资源没有被缓存, url: ${url}, 请求并缓存`);
                    return fetch(req).then((res) => {
                        if(!res || res.status >= 400/* || res.type !== 'basic'*/) {
                            log.error("[fetch handler] etch error: " + (res && res.status))
                            return res;
                        }

                        //TODO 这里需要看什么样的资源需要缓存
                        return caches.open(CONTENT_CACHE_VERSION).then((cache) => {
                            log.info(`添加缓存: ${req.url}`);
                            cache.put(req, res.clone())
                            return res
                        });
                        // return res
                    })/*.catch((err) => {
                        console.log('资源请求失败，返回默认的图片');
                        return caches.match('/pwa/source/default.png')
                    })*/
                }
            })
        )
    }
});