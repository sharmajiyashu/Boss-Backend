import { Service } from 'typedi';
import mongoose from 'mongoose';
import User, { IUser, IUserAddress, IUserLocation } from '../../models/User';

const MAX_FCM_TOKENS = 10;

type AddressInput = Omit<IUserAddress, '_id'>;

@Service()
export class UserService {
  public async getProfile(userId: string) {
    return User.findById(userId).populate('profileImage');
  }

  public async updateProfile(userId: string, data: any) {
    return User.findByIdAndUpdate(userId, data, { new: true }).populate('profileImage');
  }

  public async getLocation(userId: string) {
    const user = await User.findById(userId).select('location addresses');
    return {
      location: user?.location,
      addresses: user?.addresses ?? [],
    };
  }

  public async getAddresses(userId: string) {
    const user = await User.findById(userId).select('addresses');
    return user?.addresses ?? [];
  }

  public async addAddress(userId: string, data: AddressInput) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const addresses = user.addresses ?? [];
    const shouldBeDefault = data.isDefault || addresses.length === 0;

    if (shouldBeDefault) {
      addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const createdAddress = this.createAddressEntry({
      label: data.label,
      lat: Number(data.lat),
      lng: Number(data.lng),
      address: data.address,
      city: data.city,
      state: data.state,
      zipcode: data.zipcode,
      isDefault: shouldBeDefault,
    });

    addresses.push(createdAddress);
    user.addresses = addresses;

    if (shouldBeDefault) {
      user.location = this.buildLocationFromAddress(createdAddress, 'saved');
    }

    await user.save();

    return {
      addresses: user.addresses,
      location: user.location,
    };
  }

  public async updateAddress(userId: string, addressId: string, data: Partial<AddressInput>) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const address = this.findAddressById(user, addressId);
    if (!address) {
      throw new Error('Address not found');
    }

    if (data.label !== undefined) address.label = data.label;
    if (data.lat !== undefined) address.lat = Number(data.lat);
    if (data.lng !== undefined) address.lng = Number(data.lng);
    if (data.address !== undefined) address.address = data.address;
    if (data.city !== undefined) address.city = data.city;
    if (data.state !== undefined) address.state = data.state;
    if (data.zipcode !== undefined) address.zipcode = data.zipcode;

    if (data.isDefault) {
      user.addresses?.forEach((addr) => {
        addr.isDefault = addr._id?.toString() === addressId;
      });
      user.location = this.buildLocationFromAddress(address, 'saved');
    }

    if (user.location?.addressId?.toString() === addressId) {
      user.location = this.buildLocationFromAddress(address, user.location.source ?? 'saved');
    }

    await user.save();

    return {
      addresses: user.addresses,
      location: user.location,
    };
  }

  public async deleteAddress(userId: string, addressId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const address = this.findAddressById(user, addressId);
    if (!address) {
      throw new Error('Address not found');
    }

    const wasDefault = address.isDefault;
    const wasCurrent = user.location?.addressId?.toString() === addressId;

    user.addresses = user.addresses?.filter((addr) => addr._id?.toString() !== addressId) ?? [];

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
      if (wasCurrent) {
        user.location = this.buildLocationFromAddress(user.addresses[0], 'saved');
      }
    } else if (wasCurrent) {
      user.location = undefined;
    }

    await user.save();

    return {
      addresses: user.addresses ?? [],
      location: user.location,
    };
  }

  public async updateLocation(
    userId: string,
    data: {
      addressId?: string;
      lat?: number;
      lng?: number;
      address?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      label?: string;
      saveToAddresses?: boolean;
      source?: IUserLocation['source'];
    }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let location: IUserLocation;

    if (data.addressId) {
      const savedAddress = this.findAddressById(user, data.addressId);
      if (!savedAddress) {
        throw new Error('Address not found');
      }

      user.addresses?.forEach((addr) => {
        addr.isDefault = addr._id?.toString() === data.addressId;
      });

      location = this.buildLocationFromAddress(savedAddress, 'saved');
    } else {
      if (data.lat === undefined || data.lng === undefined) {
        throw new Error('Both lat and lng are required for a custom location');
      }

      const source = data.source ?? 'custom';
      location = {
        lat: Number(data.lat),
        lng: Number(data.lng),
        address: data.address,
        city: data.city,
        state: data.state,
        zipcode: data.zipcode,
        label: data.label,
        source,
      };

      if (data.saveToAddresses) {
        const label = data.label?.trim() || 'Custom';
        const addresses = user.addresses ?? [];

        addresses.forEach((addr) => {
          addr.isDefault = false;
        });

        const createdAddress = this.createAddressEntry({
          label,
          lat: location.lat!,
          lng: location.lng!,
          address: location.address,
          city: location.city,
          state: location.state,
          zipcode: location.zipcode,
          isDefault: true,
        });

        addresses.push(createdAddress);
        user.addresses = addresses;
        location.addressId = createdAddress._id;
        location.label = label;
        location.source = 'saved';
      }
    }

    user.location = location;
    await user.save();

    return {
      location: user.location,
      addresses: user.addresses ?? [],
    };
  }

  private findAddressById(user: IUser, addressId: string): IUserAddress | undefined {
    return user.addresses?.find((addr) => addr._id?.toString() === addressId);
  }

  private createAddressEntry(data: AddressInput): IUserAddress {
    return {
      _id: new mongoose.Types.ObjectId(),
      label: data.label,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
      city: data.city,
      state: data.state,
      zipcode: data.zipcode,
      isDefault: data.isDefault ?? false,
    };
  }

  private buildLocationFromAddress(address: IUserAddress, source: IUserLocation['source']): IUserLocation {
    return {
      lat: address.lat,
      lng: address.lng,
      address: address.address,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      label: address.label,
      addressId: address._id,
      source,
    };
  }

  /** Register device token for Firebase push (chat). Removes token from other users if reused. */
  public async registerFcmToken(userId: string, token: string, deviceType?: 'android' | 'ios' | 'web') {
    await User.updateMany(
      { _id: { $ne: userId }, 'fcmTokens.token': token },
      { $pull: { fcmTokens: { token } } }
    );

    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });

    await User.updateOne(
      { _id: userId },
      {
        $push: {
          fcmTokens: {
            $each: [{ token, deviceType, updatedAt: new Date() }],
            $position: 0,
            $slice: MAX_FCM_TOKENS,
          },
        },
      }
    );

    return User.findById(userId).select('fcmTokens').lean();
  }

  public async removeFcmToken(userId: string, token: string) {
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });
    return { ok: true };
  }
}
