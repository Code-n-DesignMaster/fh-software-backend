import { HttpException, Inject } from "@nestjs/common";
import { FileDto } from "src/modules/file";
import { MediaDto } from "../dtos";
import { MediaLirary } from "../models";
import { Model } from "mongoose";
import { PERFORMER_MEDIA_IMPORT_MODEL_PROVIDER } from "../providers";
import { ObjectId } from "mongodb";
import { FileService } from "src/modules/file/services";
import { MediaSearchRequest } from "../payloads/media-search.request";
import { UserDto } from "src/modules/user/dtos";
import { PageableData } from "src/kernel";

export class PerformerMediaLibraryService {
    constructor(
        @Inject(PERFORMER_MEDIA_IMPORT_MODEL_PROVIDER)
        private readonly mediaModel: Model<MediaLirary>,
        private readonly fileService: FileService
    ) { }


    public async importPrivateMedia(
        file: FileDto,
        id: string | ObjectId
    ): Promise<any> {
        if (!file) throw new HttpException('File is valid!', 400);
        if (file.type === 'media-import' && !file.isImage()) {
            await this.fileService.removeIfNotHaveRef(file._id);
            throw new HttpException('Invalid image!', 400);
        }

        let media = await this.fetchPerformerLocalMedias(id);
        if (media) {
            media = await this.mediaModel.update(
                { performerId: id },
                {
                    $push: { "fileIds": file }
                },
                { new: true }
            );
        } else {
            let media = await this.mediaModel.create({
                fileIds: file._id,
                performerId: id
            });

            await media.save();
        }

        const dto = new MediaDto(media);

        if (file.mimeType && (file.mimeType.includes("image") || file.mimeType.includes("video"))) {
            dto.mediaUrl = file.getUrl();
            dto._id = file._id;
        }


        return dto;
    }

    public async fetchPerformerLocalMedias(
        id: string | ObjectId
    ): Promise<any> {
        const media = await this.mediaModel.findOne({
            performerId: id
        });
        //const files = media.fileId ? media.fileId : [];
        return media;
    }

    public async performerSearch(req: MediaSearchRequest, performer?: UserDto): Promise<PageableData<MediaDto>> {

        const query = {} as any;
        if (req.q) query.title = { $regex: req.q };
        query.performerId = performer._id;
        let sort = {};
        if (req.sort && req.sortBy) {
            sort = {
                [req.sortBy]: req.sort
            };
        }

        const [data, total] = await Promise.all([
            this.mediaModel
                .find(query)
                .lean()
                .sort(sort)
                .limit(parseInt(req.limit as string, 10))
                .skip(parseInt(req.offset as string, 10)),
            this.mediaModel.countDocuments(query)
        ]);

        let fileIds = [];
        data.forEach((v) => {
            if (v.fileIds) {
                fileIds = fileIds.concat(...v.fileIds);
            }
        });


        const [files] = await Promise.all([
            fileIds.length ? this.fileService.findByIds(fileIds) : []
        ]);

        let medias = [] as MediaDto[];

        data.map((v) => {
            v.fileIds.forEach((fid) => {
                if (fid) {
                    const media = files.find((f) => fid.toString() === f._id.toString());
                    if (media) {
                        // eslint-disable-next-line no-param-reassign
                        const mediadto = new MediaDto();
                        mediadto.mediaUrl = media.getUrl();
                        mediadto._id = media._id;
                        medias.push(mediadto);
                    }
                }
            });
        });


        return {
            data: medias,
            total: medias.length
        };
    }
}