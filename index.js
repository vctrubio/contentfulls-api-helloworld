const contentful = require('contentful-management');
const fs = require('fs').promises;
const path = require('path');
const { parseTemplateFile, listContentTypes, getContentModelFields, parsePhotos, checkApiEndpoint, getContentTypeFields } = require('./utils');

async function waitForAssetProcessing(asset, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            console.log(`Processing attempt ${attempt + 1}/${maxAttempts}...`);
            const processedAsset = await asset.processForAllLocales();
            return processedAsset;
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            // Wait for 2 seconds before next attempt (increases with each attempt)
            const waitTime = 2000 * (attempt + 1);
            console.log(`Waiting ${waitTime / 1000} seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

async function uploadPhoto(environment, photoPath) {
    try {
        const fileName = path.basename(photoPath);
        const extension = path.extname(fileName).toLowerCase();

        const validExtensions = ['.jpg', '.jpeg', '.png'];
        if (!validExtensions.includes(extension)) {
            console.warn(`Skipping invalid file type: ${fileName}`);
            return null;
        }

        const contentType = extension === '.png' ? 'image/png' : 'image/jpeg';

        // Read file
        const fileBuffer = await fs.readFile(photoPath);
        const fileSizeInMB = fileBuffer.length / (1024 * 1024);

        // Log file info
        console.log(`Processing ${fileName} (${fileSizeInMB.toFixed(2)}MB)`);

        // Create upload first
        console.log('Creating upload...');
        const upload = await environment.createUpload({
            file: fileBuffer
        });

        // Create the asset with correct link type
        console.log(`Creating asset for ${fileName}...`);
        const asset = await environment.createAsset({
            fields: {
                title: {
                    'en-US': fileName
                },
                description: {
                    'en-US': `Photo for mural: ${fileName}`
                },
                file: {
                    'en-US': {
                        contentType: contentType,
                        fileName: fileName,
                        upload: `https://upload.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/uploads/${upload.sys.id}`
                    }
                }
            }
        });

        console.log('Processing asset...');
        const processedAsset = await waitForAssetProcessing(asset);

        console.log('Publishing asset...');
        const publishedAsset = await processedAsset.publish();

        console.log(`Successfully uploaded and published photo: ${fileName}`);
        return publishedAsset;
    } catch (error) {
        console.error('Error uploading photo:', error);
        console.error('Photo path:', photoPath);
        throw error;
    }
}

async function postMuralEntry(templateData, photos, dirPath) {
    try {
        const client = contentful.createClient({
            accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
        });

        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        // Upload photos first
        const photoAssets = [];
        for (const photo of photos) {
            const photoPath = path.join(dirPath, photo);
            console.log('\nUploading photo:', photo);
            const asset = await uploadPhoto(environment, photoPath);
            if (asset) {  // Only add successfully uploaded assets
                photoAssets.push({
                    sys: {
                        type: 'Link',
                        linkType: 'Asset',
                        id: asset.sys.id
                    }
                });
            }
        }

        // Format the entry data according to Contentful's structure
        const entryData = {
            fields: {
                title: {
                    'en-US': templateData.Title
                },
                location: {
                    'en-US': templateData.Location
                },
                description: {
                    'en-US': templateData.Description
                },
                category: {
                    'en-US': templateData.Category
                },
                url: {
                    'en-US': ''
                },
                photos: {
                    'en-US': photoAssets
                }
            }
        };

        console.log('Creating entry with data:', JSON.stringify(entryData, null, 2));
        const entry = await environment.createEntry('mural', entryData);

        // Publish the entry
        const publishedEntry = await entry.publish();

        console.log('Entry created and published with ID:', publishedEntry.sys.id);
        return publishedEntry;

    } catch (error) {
        console.error('Error creating mural entry:', error);
        throw error;
    }
}

// Function to process all templates in the directory
async function processTemplateDirectory(directoryPath) {
    try {
        const directories = await fs.readdir(directoryPath);

        for (const dir of directories) {
            const fullDirPath = path.join(directoryPath, dir);
            const templatePath = path.join(fullDirPath, 'template.txt');

            try {
                // Get template data
                const templateData = await parseTemplateFile(templatePath);

                // Get photos in the same directory
                const photos = await parsePhotos(fullDirPath);

                console.log('\x1b[33m%s\x1b[0m', '----------------------------------------');
                console.log(`Directory ${dir}:`);
                console.log('Template data:', templateData);
                console.log('Photos found:', photos);
                // Post the mural entry with template data
                const createdEntry = await postMuralEntry(templateData, photos, fullDirPath);
                if (createdEntry) {
                    console.log('Successfully created mural entry with photos');
                } else {
                    console.log('Failed to create mural entry');
                }
            } catch (error) {
                console.error(`Error processing directory ${dir}:`, error);
                continue;
            }
        }
    } catch (error) {
        console.error('Error processing directory:', error);
    }
}

async function trigger() {
    const directoryPath = path.join(__dirname, 'contentfull_data_post');
    try {
        await processTemplateDirectory(directoryPath);
        console.log('All templates processed successfully');
    } catch (error) {
        console.error('Error processing templates:', error);
    }
}

trigger()

///////////////////////////////////////////////////////////////////////////
async function checkApiAndContentTypes() {
    console.log('Starting API and content type checks...');

    try {
        const baseUrl = await checkApiEndpoint();
        console.log('API check completed');


        const contentTypes = await listContentTypes();
        console.log('Content types listed successfully');

        const fields = await getContentTypeFields('mural');
        if (fields) {
            console.log('Fields for mural content type retrieved successfully');
            fields.forEach(field => {
                console.log(`Field: ${field.name}, Type: ${field.type}`);
            });
        } else {
            console.log('No fields found for the mural content type');
        }

    } catch (error) {
        console.error('Error in checkApiAndContentTypes:', error);
    }
}

// checkApiAndContentTypes()