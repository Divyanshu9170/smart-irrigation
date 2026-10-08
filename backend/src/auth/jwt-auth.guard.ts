import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// ✅ Not used on any route yet in Feature 1.
// This will be applied to devices/sensor-readings controllers in Feature 3.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
