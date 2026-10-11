import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from './crop.entity';

@Injectable()
export class CropsService implements OnModuleInit {
  constructor(
    @InjectRepository(Crop)
    private cropRepo: Repository<Crop>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCrops();
  }

  async seedDefaultCrops() {
    const defaultCrops: Partial<Crop>[] = [
      {
        name: 'Tomato',
        minTemp: 18,
        maxTemp: 27,
        minPh: 6.0,
        maxPh: 6.8,
        minMoisture: 60,
        maxMoisture: 80,
        minNitrogen: 120,
        maxNitrogen: 160,
        minPhosphorus: 80,
        maxPhosphorus: 120,
        minPotassium: 150,
        maxPotassium: 220,
      },
      {
        name: 'Wheat',
        minTemp: 15,
        maxTemp: 25,
        minPh: 6.0,
        maxPh: 7.0,
        minMoisture: 45,
        maxMoisture: 65,
        minNitrogen: 100,
        maxNitrogen: 140,
        minPhosphorus: 50,
        maxPhosphorus: 80,
        minPotassium: 80,
        maxPotassium: 120,
      },
      {
        name: 'Potato',
        minTemp: 16,
        maxTemp: 22,
        minPh: 5.5,
        maxPh: 6.5,
        minMoisture: 60,
        maxMoisture: 80,
        minNitrogen: 120,
        maxNitrogen: 150,
        minPhosphorus: 60,
        maxPhosphorus: 90,
        minPotassium: 160,
        maxPotassium: 220,
      },
      {
        name: 'Chilli',
        minTemp: 20,
        maxTemp: 30,
        minPh: 6.0,
        maxPh: 6.8,
        minMoisture: 55,
        maxMoisture: 75,
        minNitrogen: 100,
        maxNitrogen: 130,
        minPhosphorus: 80,
        maxPhosphorus: 110,
        minPotassium: 120,
        maxPotassium: 160,
      },
      {
        name: 'Cucumber',
        minTemp: 22,
        maxTemp: 30,
        minPh: 5.8,
        maxPh: 6.8,
        minMoisture: 70,
        maxMoisture: 85,
        minNitrogen: 150,
        maxNitrogen: 180,
        minPhosphorus: 100,
        maxPhosphorus: 130,
        minPotassium: 200,
        maxPotassium: 250,
      },
      {
        name: 'Rice',
        minTemp: 22,
        maxTemp: 32,
        minPh: 5.5,
        maxPh: 6.5,
        minMoisture: 80,
        maxMoisture: 95,
        minNitrogen: 100,
        maxNitrogen: 140,
        minPhosphorus: 60,
        maxPhosphorus: 80,
        minPotassium: 60,
        maxPotassium: 90,
      },
      {
        name: 'Cotton',
        minTemp: 21,
        maxTemp: 30,
        minPh: 6.0,
        maxPh: 7.5,
        minMoisture: 50,
        maxMoisture: 70,
        minNitrogen: 90,
        maxNitrogen: 120,
        minPhosphorus: 40,
        maxPhosphorus: 70,
        minPotassium: 60,
        maxPotassium: 90,
      },
      {
        name: 'Maize',
        minTemp: 20,
        maxTemp: 30,
        minPh: 6.0,
        maxPh: 7.2,
        minMoisture: 60,
        maxMoisture: 75,
        minNitrogen: 120,
        maxNitrogen: 150,
        minPhosphorus: 60,
        maxPhosphorus: 90,
        minPotassium: 80,
        maxPotassium: 110,
      },
    ];

    try {
      for (const item of defaultCrops) {
        const existing = await this.cropRepo.findOne({
          where: { name: item.name },
        });
        if (!existing) {
          const c = this.cropRepo.create(item);
          await this.cropRepo.save(c);
          console.log(`🌱 Seeded crop profile: ${item.name}`);
        }
      }
    } catch (err) {
      console.log('Notice during crop seed:', err);
    }
  }

  create(data: Partial<Crop>) {
    const crop = this.cropRepo.create(data);
    return this.cropRepo.save(crop);
  }

  findAll() {
    return this.cropRepo.find();
  }

  findByName(name: string) {
    return this.cropRepo.findOne({ where: { name } });
  }

  findById(id: number) {
    return this.cropRepo.findOne({ where: { id } });
  }
}
