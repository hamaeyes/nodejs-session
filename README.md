# nodejs-session

세션 클러스터링을 위해서 Redis를 스토어로 관리하는 세션을 구현해 보자. 

connect-redis를 이용하면 심플하게 구축이 가능하다. 

---

## 필요한 패키지 라이브러리를 추가하자.

필요한 라이브러리는 아래와 같다.

morgan을 설치한 이유는 브라우저의 쿠키값이 어떻게 올라오는지 확인하기 위해서다. 

```
$ npm install express express-session morgan redis connect-redis
```

## 레디스를 구성하자. 

세션 정보를 가지는 Redis를 구축해보자. 

아래와 같이 docker로 구성해보자. 패스워드를 지정했음을 확인하자. 

```
// docker-compose.yml 

services:
  redis:
    image: docker.io/bitnami/redis:7.4
    environment:
      # ALLOW_EMPTY_PASSWORD is recommended only for development.
      - ALLOW_EMPTY_PASSWORD=no
      - REDIS_PASSWORD=passw0rd
      - REDIS_DISABLE_COMMANDS=FLUSHDB,FLUSHALL
    ports:
      - '6379:6379'
    volumes:
      - 'redis_data:/bitnami/redis/data'

volumes:
  redis_data:
    driver: local
```

## Express를 구성하자. 

express-session으로 구성한다. 

store정보만 redis로 제공하면 되기 때문에 다른 mysql 및 다른 스토어로 바꾸는 것도 쉽게 가능하다. 

redisClient를 가지는 RedisStore를  세션의 파라메터로 주입되는 부분이 핵심이다. 

```
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import {RedisStore} from "connect-redis";  // 최신 버전은 `.default` 필요  
import { createClient } from 'redis';

const redisClient = createClient({
    host: '127.0.0.1',
    port: 6379,
    password: 'passw0rd',  // Redis 비밀번호
});

redisClient.on('connect', () => console.log('🚀 Redis 연결 완료!'));
redisClient.on('error', (err) => console.error('❌ Redis 오류:', err));
redisClient.on('end', () => console.log('Redis 연결 종료') );
redisClient.connect(); 

let redisStore = new RedisStore({client:redisClient,prefix: 'oauth.session:'});

const app = express();

app.use(session({
  store: redisStore,
   secret: 'your-secret-key',  // 필수!
   resave: false,
   saveUninitialized: false, 
   cookie: { secure: false, maxAge: 1000 * 60 * 60 }
}));

// 로깅 
morgan.token('headers', (req) => JSON.stringify(req.headers));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :headers'));

app.use(express.json());

app.get('/',(req,res)=>{
    res.send("Hello, World!!");
});

app.get('/session',(req,res)=>{
    if (!req.session.views) req.session.views = 1;
    else req.session.views++;
    res.send(`Session View Cnt  ${req.session.views}`);
});

app.listen(8000,()=>{
    console.log("Server listening in http://localhost:8000")
});
```

curl 명령어를 통해서 session에 값을 생성해 본다. 

```
$ curl http://localhost:8000/session
Session View Cnt  1
$
```

Redis에 접속해서 session정보가 Redis에 저장되었는지 확인해 본다.

아래와 같이 세션이 저장되었고 만료시간이 지나면 세션이 사라질 것이다. 

```
127.0.0.1:6379> keys *
1) "oauth.session:V3laDuWJRSLi0gX9xGzpEemdIi-y_YVC"
127.0.0.1:6379>
127.0.0.1:6379> get oauth.session:V3laDuWJRSLi0gX9xGzpEemdIi-y_YVC
"{\"cookie\":{\"originalMaxAge\":3600000,\"expires\":\"2025-02-23T08:04:25.048Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"views\":13}"
127.0.0.1:6379>
```

---

## 마치며 

Express 웹 애플리케이션의 세션 스토어를 Redis를 가지도록 구현해 보았다. 웹 애플리케이션을 수평확장하여 구성을 하더라도 동일한 세션 스토어에 조회,저장을 하기 때문에 세션 크러스터링이 구현되어진다.