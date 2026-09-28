import { runSavedPdfPage } from '@/src/lib/saved-pdf-page';
import { bootExtensionPageTheme } from '@/src/lib/theme-boot';
import { installFontFaces } from '@/src/lib/fonts';
import { extensionAssetUrl } from '@/src/lib/extension-context';
import '../../assets/tailwind.css';
import '../../assets/pages.css';

bootExtensionPageTheme();
installFontFaces(document, extensionAssetUrl);
void runSavedPdfPage();
