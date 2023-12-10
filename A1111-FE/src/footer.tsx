import {
    Box,
    Container,
    Link,
    Stack,
    Center
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { PoweredByAkashLogo } from './powered-by-akash-logo';


export default function Footer() {
    return (
        <Box
            color={'gray.200'}
            opacity={0.5}>
            <Container
                as={Stack}
                maxW={'6xl'}
                py={4}
                spacing={4}
                justify={'center'}
                align={'center'}>
                <Stack direction={'row'} spacing={6}>
                    <Box
                        minW={50}
                        minH={50}
                        maxW={50}
                        maxH={50}
                        w="full"
                        h="full"
                    >
                        <Link href="https://twitter.com/zju_u" isExternal target="_blank">
                            zJ
                        </Link>
                    </Box>
                    <Box
                        minW={50}
                        minH={50}
                        maxW={50}
                        maxH={50}
                        w="full"
                        h="full"
                    >
                        <Center>
                            <AddIcon w={'6'} h={'12'} />
                        </Center>
                    </Box>
                    <Box
                        minW={50}
                        minH={50}
                        maxW={50}
                        maxH={50}
                        w="full"
                        h="full"
                    >
                        <Center>
                            <Link href="https://nodumpnode.com" isExternal target="_blank">
                                NDN
                            </Link>
                        </Center>
                    </Box>
                </Stack>
            </Container>

            <Container
                as={Stack}
                maxW={'6xl'}
                py={4}
                spacing={4}
                justify={'center'}
                align={'center'}>
                <Stack direction={'column'} spacing={6}>
                    <Box
                        minH={50}
                        maxH={50}
                        w="full"
                        h="full"
                    >
                        <PoweredByAkashLogo light={false} alt='Powered by Akash Network' />
                    </Box>
                    <Box
                        minH={50}
                        maxH={50}
                        w="full"
                        h="full"
                    ><Center>
                            v1.1
                        </Center>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}