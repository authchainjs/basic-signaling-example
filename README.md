# Basic WebRTC Signaling WebSocket Example

> This library (example) is derivation of original work ([websocket-over-nodejs](https://github.com/muaz-khan/WebRTC-Experiment/tree/master/websocket-over-nodejs)) of [Muaz Khan](https://github.com/muaz-khan)
>
> NOTE: this use [uws v10.148.1](https://www.npmjs.com/package/uws) (**deprecated**) module ... await for news from [uNetworking](https://github.com/uNetworking/uWebSockets-node)


----



## Todo

Many things to do ... a listing will be created later


## Proxy (approach)

For example using proxyng over **Nginx** (basic):


**/etc/nginx/nginx.conf**

```none
http {

    ##
    # node socket upstream
    ##
    upstream socket_nodes {
      ip_hash;
      server localhost:3000 weight=5;
      server localhost:3000;
    }

}
```

**/ect/nginx/sites-enabled/your-site.conf**

```none
server {

    location / {

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-ProtoVersion $server_protocol;
        proxy_set_header Host $host;
        proxy_pass http://socket_nodes;
    }

}
```

## Thanks

This work is only possible thanks to the use of open source librarie ([websocket-over-nodejs](https://github.com/muaz-khan/WebRTC-Experiment/tree/master/websocket-over-nodejs)) written by [Muaz Khan](https://github.com/muaz-khan)


## License

This source code is licensed under [The MIT License (MIT)](https://github.com/authchainjs/basic-signaling-example/blob/master/LICENSE)

If you believe that the other sources (of third parties) may contain a conflict with this license please contact us in this email: [authchainjs@gmail.com](mailto:authchainjs@gmail.com?subject=LICENSE)
