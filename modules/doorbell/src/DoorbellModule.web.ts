import { registerWebModule, NativeModule } from 'expo';

import { DoorbellModuleEvents } from './Doorbell.types';

// The doorbell needs a native Android service and is not available on the web.
class DoorbellModule extends NativeModule<DoorbellModuleEvents> {}

export default registerWebModule(DoorbellModule, 'DoorbellModule');
