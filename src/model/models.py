"""Model implementations and factories.

This module provides a small ResNet-10 implemented from scratch plus
convenience factory wrappers for ResNet-50 and EfficientNet-B0 so you can
demonstrate custom model code without changing the existing training
script. The training script in `src/train/train.py` is unchanged and will
continue to use its own model builders.
"""
from typing import Type, Callable, List

import torch
import torch.nn as nn
from torchvision import models as tv_models


def conv3x3(in_planes, out_planes, stride=1, groups=1, dilation=1):
    return nn.Conv2d(in_planes, out_planes, kernel_size=3, stride=stride,
                     padding=dilation, groups=groups, bias=False, dilation=dilation)


def conv1x1(in_planes, out_planes, stride=1):
    return nn.Conv2d(in_planes, out_planes, kernel_size=1, stride=stride, bias=False)


class BasicBlock(nn.Module):
    expansion = 1

    def __init__(self, inplanes, planes, stride=1, downsample=None):
        super().__init__()
        self.conv1 = conv3x3(inplanes, planes, stride)
        self.bn1 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = conv3x3(planes, planes)
        self.bn2 = nn.BatchNorm2d(planes)
        self.downsample = downsample

    def forward(self, x):
        identity = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        out = self.relu(out)
        return out


class ResNetCustom(nn.Module):
    def __init__(self, block: Type[BasicBlock], layers: List[int], num_classes: int = 1000):
        super().__init__()
        self.inplanes = 64
        self.conv1 = nn.Conv2d(3, self.inplanes, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(self.inplanes)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        self.layer1 = self._make_layer(block, 64, layers[0])
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(block, 512, layers[3], stride=2)

        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(512 * block.expansion, num_classes)

        # initialize weights
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def _make_layer(self, block, planes, blocks, stride=1):
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                conv1x1(self.inplanes, planes * block.expansion, stride),
                nn.BatchNorm2d(planes * block.expansion),
            )

        layers = []
        layers.append(block(self.inplanes, planes, stride, downsample))
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))

        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.fc(x)
        return x


def resnet10(num_classes: int = 1000) -> nn.Module:
    """Constructs a ResNet-10 model (using BasicBlock with [1,1,1,1])."""
    return ResNetCustom(BasicBlock, [1, 1, 1, 1], num_classes=num_classes)


def resnet50(num_classes: int = 1000, pretrained: bool = False) -> nn.Module:
    """Wrapper that returns torchvision's ResNet-50 with modified final layer."""
    model = tv_models.resnet50(pretrained=pretrained)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model


def efficientnet_b0(num_classes: int = 1000, pretrained: bool = False) -> nn.Module:
    """Wrapper that returns torchvision's EfficientNet-B0 with modified classifier."""
    # torchvision efficientnet api depends on version; use the standard name
    model = tv_models.efficientnet_b0(pretrained=pretrained)
    # classifier is typically (Dropout, Linear)
    try:
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)
    except Exception:
        # fallback for different torchvision versions
        model.classifier = nn.Sequential(nn.Dropout(0.2), nn.Linear(model.classifier.in_features, num_classes))
    return model


__all__ = ['resnet10', 'resnet50', 'efficientnet_b0']
