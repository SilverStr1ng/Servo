import { spawn } from 'child_process';

export interface DracoOptions {
  method?: 'edgebreaker' | 'sequential';
  compressionLevel?: number;
  quantizePositionBits?: number;
  quantizeNormalBits?: number;
  quantizeTexcoordBits?: number;
  quantizeColorBits?: number;
  quantizeGenericBits?: number;
}

export interface Ktx2Options {
  mode?: 'etc1s' | 'uastc';
  quality?: number;
  compression?: number;
  powerOfTwo?: boolean;
}

export interface OptimizeOptions {
  draco?: boolean;
  dracoOptions?: DracoOptions;
  meshopt?: boolean;
  ktx2?: boolean;
  ktx2Options?: Ktx2Options;
}

export async function convertFbxToGlb(
  fbx2gltfPath: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(fbx2gltfPath, ['-i', inputPath, '-o', outputPath, '--binary']);

    child.on('error', (err) => reject(new Error(`Failed to start fbx2gltf at ${fbx2gltfPath}: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fbx2gltf exited with code ${code}`));
    });
  });
}

export async function optimizeGlb(
  inputBuffer: Buffer,
  options: OptimizeOptions,
  toktxPath?: string
): Promise<Uint8Array> {
  try {
    const { WebIO } = await import('@gltf-transform/core');
    const { draco, meshopt } = await import('@gltf-transform/functions');
    const { KHRMeshQuantization, KHRDracoMeshCompression, KHRTextureBasisu, EXTMeshoptCompression } = await import('@gltf-transform/extensions');
    const draco3d = await import('draco3dgltf');
    const { MeshoptEncoder } = await import('meshoptimizer');
    const { default: sharp } = await import('sharp');
    const { writeFileSync, readFileSync, unlinkSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    const { execFileSync } = await import('child_process');

    const io = new WebIO().registerExtensions([KHRMeshQuantization, KHRDracoMeshCompression, KHRTextureBasisu, EXTMeshoptCompression]);
    const doc = await io.readBinary(inputBuffer);
    const transforms = [];

    let dracoEncoderModule: unknown | null = null;
    let dracoDecoderModule: unknown | null = null;

    if (options.draco) {
      // @ts-ignore
      const dracoEncoder = await (draco3d.createEncoderModule ? draco3d.createEncoderModule() : draco3d.default?.createEncoderModule());
      // @ts-ignore
      const dracoDecoder = await (draco3d.createDecoderModule ? draco3d.createDecoderModule() : draco3d.default?.createDecoderModule());
      if (dracoEncoder && dracoDecoder) {
        dracoEncoderModule = dracoEncoder;
        dracoDecoderModule = dracoDecoder;
        transforms.push(draco({
          encoder: dracoEncoder,
          decoder: dracoDecoder,
          ...options.dracoOptions
        }));
      }
    }

    if (dracoEncoderModule) {
      io.registerDependencies({
        'draco3d.encoder': dracoEncoderModule,
        ...(dracoDecoderModule ? { 'draco3d.decoder': dracoDecoderModule } : {})
      });
    }

    if (options.meshopt) {
      await MeshoptEncoder.ready;
      io.registerDependencies({
        'meshopt.encoder': MeshoptEncoder
      });
      transforms.push(meshopt({ encoder: MeshoptEncoder }));
    }

    if (options.ktx2) {
      if (!toktxPath) {
        console.warn('toktxPath not provided, skipping KTX2 compression');
      } else {
        doc.createExtension(KHRTextureBasisu).setRequired(true);
        const textures = doc.getRoot().listTextures();

        for (const texture of textures) {
          const mimeType = texture.getMimeType();
          if (mimeType === 'image/ktx2') continue;

          const image = texture.getImage();
          if (!image) continue;

          const timestamp = Date.now() + Math.random();
          const tmpIn = join(tmpdir(), `ktx2_in_${timestamp}.png`);
          const tmpOut = join(tmpdir(), `ktx2_out_${timestamp}.ktx2`);

          try {
            const pngBuffer = await sharp(image).png().toBuffer();
            writeFileSync(tmpIn, pngBuffer);

            const mode = options.ktx2Options?.mode === 'uastc' ? '--uastc' : '--bcmp';
            const args = [mode, '--genmipmap', tmpOut, tmpIn].filter(Boolean);
            const execEnv = { ...process.env, TOKTX_OPTIONS: '' };

            try {
              execFileSync(toktxPath, args, { stdio: 'pipe', env: execEnv });
            } catch (e: any) {
              const stderr = e?.stderr ? e.stderr.toString() : '';
              const stdout = e?.stdout ? e.stdout.toString() : '';
              console.warn('toktx failed with mipmaps, retrying without --genmipmap', { stdout, stderr });
              execFileSync(toktxPath, [mode, tmpOut, tmpIn].filter(Boolean), { stdio: 'pipe', env: execEnv });
            }

            const ktx2Buffer = readFileSync(tmpOut);
            texture.setImage(ktx2Buffer).setMimeType('image/ktx2');

            const uri = texture.getURI();
            if (uri) {
              texture.setURI(uri.replace(/\.[^.]+$/, '.ktx2'));
            }
          } catch (e) {
            console.error('toktx failed:', e);
          } finally {
            try { if (existsSync(tmpIn)) unlinkSync(tmpIn); } catch {}
            try { if (existsSync(tmpOut)) unlinkSync(tmpOut); } catch {}
          }
        }
      }
    }

    if (transforms.length > 0) {
      // @ts-ignore
      await doc.transform(...transforms);
    }

    return await io.writeBinary(doc);
  } catch (err) {
    console.error('Optimization failed, returning original buffer:', err);
    return new Uint8Array(inputBuffer);
  }
}
