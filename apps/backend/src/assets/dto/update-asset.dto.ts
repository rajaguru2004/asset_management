import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

// assetTag and categoryId are immutable after creation.
export class UpdateAssetDto extends PartialType(OmitType(CreateAssetDto, ['categoryId'] as const)) {}
