import { BadRequestException, Controller, Get, Inject, Query,Headers, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { randomUUID } from 'crypto';

import * as qrcode from "qrcode"
import { JwtService } from '@nestjs/jwt';
import { log } from 'console';



// 利用map来存储
interface QrCodeInfo {
  status: 'noscan' | 'scan_wait_confirm' | 'scan_confirm' | 'scan_cancel' | 'expired',
  userInfo?: {
    userId: number
  }
}

const map = new Map<string, QrCodeInfo>()

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 注入jwt
  @Inject(JwtService)
  private jwtService:JwtService

  // 定义用户
  private users = [
    {id: 1, username: "wanwan", pwd: 'wawys'},
    {id: 2, username: "柠檬茶小子", pwd: 'wahnmc'},
  ]

  @Get()
  getHello(): string {
    debugger;
    return this.appService.getHello();
  }

  @Get('login')
  async login(@Query('username') username: string, @Query('pwd') pwd: string){
    const user = this.users.find(item => item.username === username)
    
    if(!user){
      throw new UnauthorizedException('用户不存在')
    }
    if(user.pwd !== pwd){
      throw new  UnauthorizedException('密码错误')
    }
    // 登录成功返回token
    return {
      token: await this.jwtService.sign({
        userId: user.id
      })
    }
  }
  // 查询用户信息
  @Get('userInfo')
  async userInfo(@Headers('Authorization') auth: string) {
      try{
        const [, token] = auth.split(' ');
        const info = await this.jwtService.verify(token);
  
        const user = this.users.find(item => item.id == info.userId);
        return user;
      } catch(e) {
        throw new UnauthorizedException('token 过期，请重新登录');
      }
  }
  

  @Get('qrcode/generate')
  async generate(){
    const uuid = randomUUID()
    // 生成二维码相关数据
    const dataUrl = await qrcode.toDataURL(`http://192.168.126.50:3000/pages/confirm.html?id=${uuid}`)
    // 存储到map中
    map.set(`qrcode_${uuid}`, {
      status: 'noscan'
    })
    
    return {
      qrcode_id: uuid,
      img: dataUrl
    }
  }

  // 检查二维码状态
  @Get('qrcode/check')
  async check(@Query('id') id: string) {
    const info = map.get(`qrcode_${id}`)
    
    return map.get(`qrcode_${id}`)
  }

  // 扫描
  @Get('qrcode/scan')
  async scan(@Query('id') id:string){
    const info = map.get(`qrcode_${id}`);
    
    if(!info){
      throw new BadRequestException("二维码已过期")
    }
    info.status = 'scan_wait_confirm'
    return 'success'
  }

  // 确认
  @Get('qrcode/confirm')
  async confirm(@Query('id') id:string, @Headers('Authorization') auth:string){
    let user;
    try {
      const [, token] = auth.split(' ')
      const info = await this.jwtService.verify(token)

      user = this.users.find(item => item.id === info.userId)
    } catch (error) {
      throw new UnauthorizedException('token过期 请重新登录')
    }

    const info = map.get(`qrcode_${id}`)
    if(!info) throw new BadRequestException('二维码已过期')
    
    info.status = 'scan_confirm'
    info.userInfo = user
    console.log("info", info);
    return 'succes'
  }

  // 取消
  @Get('qrcode/cancel')
  async cancel(@Query('id') id:string){
    const info = map.get(`qrcode_${id}`)
    if(!info) throw new BadRequestException('二维码已过期')
    info.status = 'scan_cancel'
    return 'succes'
  }

}
