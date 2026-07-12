import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLibraryItemDto } from './create-library-item.dto';

// libName/dataId are immutable after creation (same trick as Asset.assetTag).
export class UpdateLibraryItemDto extends PartialType(
  OmitType(CreateLibraryItemDto, ['libName', 'dataId'] as const),
) {}
