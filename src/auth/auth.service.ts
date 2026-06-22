import { ConflictException, Injectable } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async signup(signupDto: SignUpDto) {
    const existing = await this.userRepository.findOne({
      where: {
        email: signupDto.email
      }
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = this.userRepository.create({
      email: signupDto.email,
      password: hashedPassword
    });

    await this.userRepository.save(user);

    //jwt token
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { token, user };
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
