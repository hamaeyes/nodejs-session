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
 