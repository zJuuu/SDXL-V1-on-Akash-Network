import * as React from "react"
import { selectAnatomy } from '@chakra-ui/anatomy'
import {
	Box,
	Button,
	Flex,
	FormControl,
	FormLabel,
	Heading,
	Input,
	InputGroup,
	Stack,
	VStack,
	ChakraProvider,
	Slider,
	SliderFilledTrack,
	SliderThumb,
	SliderTrack,
	useToast,
	FormHelperText,
	SliderMark,
	Center,
	Text,
	createMultiStyleConfigHelpers,
	Link,
	Textarea,
} from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'
import { useState } from "react"
import PhotoAlbum from "react-photo-album"
import ResizeTextarea from "react-textarea-autosize";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import ReconnectingWebSocket from "reconnecting-websocket";
import Footer from "./footer";
import { AkashLogo } from "./akash-logo";
//import './scss/fonts.scss'
import { Select } from "chakra-react-select";
import { samplerOptions } from "./sampler"

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(selectAnatomy.keys)

const baseStyle = definePartsStyle({
	// define the part you're going to style
	field: {
		fontFamily: `'Satoshi', normal`,
		background: '#ffbaba'
	},
	icon: {
		color: '#FFB2B2',
	},
})

const selectTheme = defineMultiStyleConfig({ baseStyle })

const themeExtended = extendTheme({
	initialColorMode: 'dark',
	useSystemColorMode: false,
	fonts: {
		heading: `'Satoshi', normal`,
		body: `'Satoshi', normal`
	},
	components: { Select: selectTheme },
})

export const App = () => {
	const toast = useToast()
	const toastIdRef = React.useRef()
	const [photos, setPhotos] = useState<{src: string; width: number; height: number; srcSet: [{ src: string; width: number; height: number; }]}[]>([]);

	const [socket, setSocket] = useState<ReconnectingWebSocket | null>(null);
	const [prompt, setPrompt] = useState("");
	const [negativePrompt, setNegativePrompt] = useState("");
	const [refinerSwitch, setRefinerSwitch] = useState(0.8);
	const [samplerName, setSamplerName] = useState("DPM2++ 2M Karras");
	const [index, setIndex] = useState(-1);
	const [isProcessing, setProcessing] = useState(false);

	React.useEffect(() => {
		// Connect to the WebSocket server
		const ws = new ReconnectingWebSocket('ws://localhost:3001');

		ws.onopen = () => {
			console.log('Connected to server');
		};

		ws.onmessage = async (event) => {
			const data = JSON.parse(event.data);
			if (data.status !== 200) {
				toast({ description: 'Please wait for the Job to finish', status: 'error', duration: 4000, isClosable: false })
			} else {
				updateToast();
				setProcessing(false);

				for (const img of data.images) {
					const base64Response = await fetch(`data:image/png;base64,${img}`);
					const objUrl = URL.createObjectURL(await base64Response.blob())

					setPhotos(photos => [{
						src: objUrl,
						srcSet: [{ src: objUrl, width: 1024, height: 1024 }],
						width: 1024,
						height: 1024,
					}, ...photos]);
				}
			}
		};

		ws.onclose = () => {
			console.log('Disconnected from Server');
		};

		setSocket(ws);

		return () => {
			// Clean up the WebSocket connection when the component unmounts
			if (ws) {
				ws.close();
			}
		};
	}, []);

	const sendMessage = () => {
		if (socket && !isProcessing) {
			setProcessing(true);
			const msg = JSON.stringify({ sampler: samplerName, prompt: prompt.replace(/[\r\n]+/gm, " "), negativePrompt: negativePrompt.replace(/[\r\n]+/gm, " "), refinerSwitch: refinerSwitch });
			socket.send(msg);
			addToast();
		}
		if (isProcessing) {
			toast({ description: 'Please wait for the Job to finish', status: 'error', duration: 4000, isClosable: false })
		}
	};

	function updateToast() {
		if (toastIdRef.current) {
			toast.update(toastIdRef.current, { description: 'Success!', status: 'success', duration: 3000, isClosable: true })
		}
	}

	function addToast() {
		//@ts-ignore
		toastIdRef.current = toast({ description: 'Generating images', status: 'loading', duration: null, isClosable: false })
	}


	return (
		<ChakraProvider theme={themeExtended}>
			<Flex
				bg={'#212529'}
				align="center"
				justify="center"
				id="contact">
				<Box borderRadius="lg" m={{ base: 5, md: 16, lg: 10 }} p={{ base: 5, lg: 16 }}>
					<Box>
						<VStack spacing={{ base: 4, md: 8, lg: 20 }}>
							<Heading
								fontSize={{
									base: '4xl',
									md: '5xl',
								}}>
								<Stack
									spacing={{ base: 3, md: 5, lg: 5 }}
									direction={{ base: 'column', md: 'row' }}
									color={'whiteAlpha.900'}>
									<Box>
										SDXL on
									</Box>
									<Box>
										<Center>
											<AkashLogo />
										</Center>
									</Box>
								</Stack>
							</Heading>

							<Stack
								spacing={{ base: 4, md: 8, lg: 20 }}
								direction={{ base: 'column', md: 'row' }}
								w={["100%", "30em", "48em"]}>


								<Box
									bg={'whiteAlpha.900'}
									borderRadius="lg"
									p={8}
									color={'gray.700'}
									shadow="base">
									<VStack spacing={5}>
										<Text fontSize='md' align={'center'}>SDXL is a high quality text-to-image model from Stability AI. This application is running on NVIDIA A100s leased from the Akash Supercloud, to achieve high-performing and cost-effective inference of 1024×1024 images.</Text>
										<Link href="https://akashnet.typeform.com/to/rhR4cWxQ"><Text fontSize='md' align={'center'}><u>Interested in accessing high-performance GPUs on Akash?</u></Text></Link>

										<FormControl>
											<FormLabel>Prompt</FormLabel>

											<InputGroup>
												<Textarea style={{ resize: "none" }} minRows={1} rows={1} maxRows={6} as={ResizeTextarea} _placeholder={{ color: 'gray.700' }} maxLength={400} placeholder="A futuristic city with neon lights, rainy streets, bright colors, detailed" onChange={(event) => setPrompt(event.target.value)} value={prompt} borderColor={'gray.300'} focusBorderColor="gray.500" _focus={{ boxShadow: "none" }} />
											</InputGroup>
										</FormControl>

										<FormControl>
											<FormLabel>Negative Prompt</FormLabel>

											<InputGroup>
												<Textarea style={{ resize: "none" }} minRows={1} rows={1} maxRows={6} as={ResizeTextarea} _placeholder={{ color: 'gray.700' }} maxLength={400} onChange={(event) => setNegativePrompt(event.target.value)} value={negativePrompt} borderColor={'gray.300'} focusBorderColor="gray.500" _focus={{ boxShadow: "none" }} />
											</InputGroup>
											<FormHelperText textColor={'gray.500'}>Parameter that tells SD what you don't want to see in the generated images</FormHelperText>
										</FormControl>

										<FormControl>
											<FormLabel>Sampler Name</FormLabel>
											<Select
												chakraStyles={{
													menuList: (provided) => ({
														...provided,
														color: "black",
														bg: "#FFB2B2",
													}),
													menu: (provided) => ({
														...provided,
														zIndex: 9999,
													}),
													option: (provided, state) => ({
														...provided,
														color: "black",
														bg: state.isFocused ? "#ffbaba" : "#FFB2B2",
													}),
													control: (provided, state) => ({
														...provided,
														color: "gray.700",
														borderColor: state.isFocused ? "gray.500" : "gray.300",
														focusBorderColor: "gray.500",
														_focus: {
															borderColor: "gray.500",
															boxShadow: "none",
														},
														_placeholder: { color: 'gray.700' }
													}),
												}}
												options={samplerOptions}
												onChange={(event) => {
													if (event !== null) {
														setSamplerName(event.value);
													}
												}}
											/>
											<FormHelperText textColor={'gray.500'}>Different samplers give different results</FormHelperText>
										</FormControl>

										<FormControl>
											<FormLabel>Refiner Switch</FormLabel>


											<Slider aria-label='slider-ex-1' min={0.1} max={0.9} step={0.1} onChange={(val) => setRefinerSwitch(val)} defaultValue={0.8}>
												<SliderMark
													value={refinerSwitch}
													textAlign='center'
													bg='#FFB2B2'
													color='black'
													mt='-10'
													ml='-5'
													w='12'
												>
													{refinerSwitch}
												</SliderMark>
												<SliderTrack>
													<SliderFilledTrack bg={'#FFB2B2'} />
												</SliderTrack>
												<SliderThumb zIndex={1} />
											</Slider>
											<FormHelperText textColor={'gray.500'}>Switches to refiner model after x steps</FormHelperText>
										</FormControl>

										<Button
											bg="#FFB2B2"
											color="black"
											_hover={{
												bg: '#ffbaba',
											}}
											width="full"
											onClick={sendMessage}>
											Generate Images
										</Button>
									</VStack>
								</Box>
							</Stack>
						</VStack>
					</Box>
					<Box borderRadius="lg" m={{ base: 5, md: 16, lg: 10 }} p={{ base: 5, lg: 16 }}>
						<PhotoAlbum
							layout="rows"
							photos={photos}
							targetRowHeight={400}
							onClick={({ index: current }) => setIndex(current)}
						/>
						<Lightbox
							index={index}
							slides={photos}
							open={index >= 0}
							close={() => setIndex(-1)}
							plugins={[Fullscreen, Slideshow, Zoom, Thumbnails]}
						/>
					</Box>
					<Box>
						<Footer />
					</Box>
				</Box>
			</Flex>
		</ChakraProvider>
	)
}